import {
    Stack,
    Typography,
    TableContainer,
    TableHead,
    TableRow,
    TableBody,
    TableCell,
    Table,
    Paper,
    Card,
    CircularProgress,
    TablePagination
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { upperCase } from 'lodash';
import moment from 'moment';
import { useEffect, useState } from 'react';
import discount_report from 'api/discount_report';

export const ReportTypeEnum = Object.freeze({
    SALES: 0,
    DISCOUNTS: 1
});


function SalesReports({ generated, ...initialParams }) {

    const clip = (value) => {
        if(!value)
            value = 0
        return value.toFixed(2)
    }

    const params = _.pickBy(
        {
            ...initialParams,
            status: 'completed',
        },
        (value) => value != null
    );  


    const { data: sales, isLoading: loading, isRefetching, refetch } = useQuery({
        queryKey: ['sales', generated], 
        queryFn: () => discount_report.GetAllSalesReport(params),
        enabled: generated > 0,
        refetchOnWindowFocus: false
    });

    
    // useEffect(() => {
    //     refetch()
    // }, [generated])
  
    const isLoading = loading || isRefetching

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const filteredSales = sales
        ?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const renderTable = (children) => (
        <Card sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& .MuiTable-cell': { textWrap: 'nowrap' } }}>
                                <TableCell>Invoice No.</TableCell>
                                <TableCell>Grand Accum. Sales Ending Balance</TableCell>
                                <TableCell>Grand Accum. Openning Fund</TableCell>
                                <TableCell>Total Gross Sales</TableCell>
                                <TableCell>Total Deductions</TableCell>
                                <TableCell>Total Member Discount</TableCell>
                                <TableCell>Total Net Sales</TableCell>
                                <TableCell>Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!isLoading && filteredSales
                            ?.map((report) => {

                                return (
                                    <TableRow key={report._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ textWrap: 'nowrap' }}>
                                            {report.invoiceStartNumber ? `${String(report.invoiceStartNumber).padStart(6, '0')} - ${String(report.invoiceEndNumber).padStart(6, '0')}` : '---'}
                                        </TableCell>
                                        <TableCell>{clip(report.endingCashCount?.total)}</TableCell>
                                        <TableCell>{clip(report.openingFund?.total)}</TableCell>
                                        <TableCell>{clip(report.totalSalesWithoutMemberDiscount)}</TableCell>
                                        <TableCell>{clip(report.salesAdjustment.refunded)}</TableCell>
                                        <TableCell>{clip(report.totalMemberDiscount)}</TableCell>
                                        <TableCell>{clip(report.totalNetSales)}</TableCell>
                                        <TableCell>{moment(report.date).format('YYYY-MM-DD')}</TableCell>
                                    </TableRow>
                                )
                            })}
                    </TableBody>
                </Table>
                {children}
                {/* <Stack py={1.5} px={2.5} justifyContent='space-between' direction='row'>
                <Button variant='outlined'>Previous</Button>
                <Button variant='outlined'>Next</Button>
                </Stack> */}
            </TableContainer>
            <div style={{ flex: '0 1 auto' }}>
                <TablePagination
                    component="div"
                    count={filteredSales?.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </div>
        </Card>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (isLoading) {
        return renderTable(renderMessage(<CircularProgress size={28} />));
    }

    if (!sales || sales.length === 0) {
        return renderTable(
            renderMessage(
                <Typography color="lightgray" variant="h5">
                    No data available for this table
                </Typography>
            )
        );
    }

    return renderTable();
}

export default SalesReports;
