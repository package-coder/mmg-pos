import { Stack, Typography, TableContainer, TableHead, TableRow, TableBody, TableCell, Table, Card, CircularProgress } from '@mui/material';
import { useQuery } from 'react-query';
import _ from 'lodash';
import moment from 'moment';
import { useState } from 'react';
import discount_report from 'api/discount_report';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';
import ReportPagination from 'ui-component/ReportPagination';
import ExportRowButton from './ExportRowButton';

export const ReportTypeEnum = Object.freeze({
    SALES: 0,
    DISCOUNTS: 1
});

const TABLE_HEADS = [
    'Invoice No.',
    'Grand Accum. Sales Ending Balance',
    'Grand Accum. Opening Fund',
    'Total Gross Sales',
    'Total Deductions',
    'Total Member Discount',
    'Total Net Sales',
    'Date',
    'Branch',
    'MIN',
    'SN',
    'PTU No.',
    ''
];

const rowKey = (report) => `${report.branch?._id}|${report.ptuNumber}|${report.date}`;

function SalesReports({ generated, onExport, exportingKey, ...initialParams }) {
    const clip = (value) => (value ? value : 0).toFixed(2);

    const params = _.pickBy(
        {
            ...initialParams,
            status: 'completed'
        },
        (value) => value != null
    );

    const {
        data: sales,
        isLoading: loading,
        isRefetching
    } = useQuery({
        queryKey: ['sales', generated],
        queryFn: () => discount_report.GetAllSalesReport(params),
        enabled: generated > 0,
        refetchOnWindowFocus: false
    });

    const isLoading = loading || isRefetching;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const filteredSales = sales?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Card sx={{ overflow: 'hidden' }}>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            {TABLE_HEADS.map((head) => (
                                <TableCell
                                    key={head}
                                    sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textWrap: 'nowrap' }}
                                >
                                    {head.toUpperCase()}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!isLoading && (!filteredSales || filteredSales.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={TABLE_HEADS.length}>
                                    <Stack alignItems="center" py={6}>
                                        <Typography color="text.secondary" variant="h5">
                                            No data available for this table
                                        </Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading &&
                            filteredSales?.map((report) => (
                                <TableRow key={report._id} hover>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {report.invoiceStartNumber
                                            ? `${String(report.invoiceStartNumber).padStart(6, '0')} - ${String(report.invoiceEndNumber).padStart(6, '0')}`
                                            : '---'}
                                    </TableCell>
                                    <TableCell>{clip(report.endingCashCount?.total)}</TableCell>
                                    <TableCell>{clip(report.openingFund?.total)}</TableCell>
                                    <TableCell>{clip(report.salesSummary?.grossSales)}</TableCell>
                                    <TableCell>{clip((report.salesSummary?.cancelled || 0) + (report.salesSummary?.refunded || 0))}</TableCell>
                                    <TableCell>{clip(report.salesSummary?.discount)}</TableCell>
                                    <TableCell>{clip(report.salesSummary?.netSales)}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{moment(report.date).format('YYYY-MM-DD')}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{report.branch?.name || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{report.min || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{report.sn || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{report.ptuNumber || '---'}</TableCell>
                                    <TableCell>
                                        <ExportRowButton
                                            loading={exportingKey === rowKey(report)}
                                            disabled={!!exportingKey}
                                            onClick={() =>
                                                onExport(
                                                    rowKey(report),
                                                    {
                                                        type: 'sales',
                                                        branchId: report.branch?._id,
                                                        ptuNumber: report.ptuNumber || '-',
                                                        dateFilter: DateFilterEnum.CUSTOM_FILTER,
                                                        startDate: report.date,
                                                        endDate: report.date
                                                    },
                                                    `annex_sales_summary-${report.ptuNumber || 'no-ptu'}-${report.date}.xlsx`
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                {isLoading && (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress size={28} />
                    </Stack>
                )}
            </TableContainer>
            <ReportPagination
                count={sales?.length || 0}
                page={page}
                onPageChange={setPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(value) => {
                    setRowsPerPage(value);
                    setPage(0);
                }}
                itemLabel="records"
            />
        </Card>
    );
}

export default SalesReports;
