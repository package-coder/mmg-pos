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
import { useState } from 'react';
import discount_report from 'api/discount_report';

const getMemberDiscount = (discounts) => {
    const memberDiscounts = discounts?.filter(v => !!v.memberType)
    return memberDiscounts && memberDiscounts?.length > 0 ? memberDiscounts[0] : null
}

function DiscountReports({ generated, ...initialParams }) {

    const params = _.pickBy(
        {
            ...initialParams,
            status: 'completed',
        },
        (value) => value != null
    );  

    const { data: discounts, isLoading } = useQuery({
        queryKey: ['discount', generated], 
        queryFn: () => discount_report.GetAllDiscountReport(params),
        enabled: generated > 0,
        refetchOnWindowFocus: false
    });
  

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const filteredDiscounts = discounts
        ?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    console.log('filteredDiscounts', filteredDiscounts);

    const renderTable = (children) => (
        <Card sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Invoice Range #</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Member ID</TableCell>
                            <TableCell>Member Type</TableCell>
                            <TableCell>Gross Sales</TableCell>
                            <TableCell>Member Discount</TableCell>
                            <TableCell>Total Discount</TableCell>
                            <TableCell>Net Sales</TableCell>
                            <TableCell>Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!isLoading && filteredDiscounts
                            ?.map((transaction) => {
                                const memberDiscount = getMemberDiscount(transaction.discounts)

                                return (
                                    <TableRow key={transaction._id} sx={{ '&:last-child td, &:last-child th': { textTransform: 'capitalize', border: 0 } }}>
                                        <TableCell component="th" scope="row">
                                            {String(transaction.transaction.invoiceNumber).padStart(6, '0')}
                                        </TableCell>
                                        <TableCell>{transaction.customer.name}</TableCell>
                                        <TableCell>{transaction.customer?.customer_type_id}</TableCell>
                                        <TableCell>
                                            {upperCase(transaction.memberType)}
                                        </TableCell>
                                        <TableCell>{transaction.transaction.totalGrossSales.toFixed(2)}</TableCell>
                                        <TableCell>{transaction.value}{`${transaction.type == 'percentage' ? '%' : ''}`}</TableCell>
                                        <TableCell>{transaction.transaction.totalDiscount.toFixed(2)}</TableCell>
                                        <TableCell>{transaction.transaction.totalNetSales.toFixed(2)}</TableCell>                                    
                                        <TableCell sx={{ textWrap: 'nowrap' }}>{moment(transaction.transaction.transactionDate).format('YYYY-MM-DD hh:mmA')}</TableCell>
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
                    count={filteredDiscounts?.length}
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

    if (!discounts || discounts.length === 0) {
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

export default DiscountReports;
