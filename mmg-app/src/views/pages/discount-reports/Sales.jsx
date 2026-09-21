import { Stack, Typography, TableContainer, TableHead, TableRow, TableBody, TableCell, Table, Card, CircularProgress } from '@mui/material';
import { useQuery } from 'react-query';
import _ from 'lodash';
import moment from 'moment';
import { useState } from 'react';
import discount_report from 'api/discount_report';
import ReportPagination from 'ui-component/ReportPagination';
import ExportRowButton from './ExportRowButton';

export const ReportTypeEnum = Object.freeze({
    SALES: 0,
    DISCOUNTS: 1
});

const TABLE_HEADS = [
    'Export',
    'Branch',
    'PTU No.',
    'MIN',
    'SN',
    'Invoice No.',
    'Grand Accum. Sales Ending Balance',
    'Grand Accum. Opening Fund',
    'Total Gross Sales',
    'Total Deductions',
    'Total Member Discount',
    'Total Net Sales',
    'Date'
];

const NO_PTU = '-';
const groupKey = (report) => `${report.branch?._id}|${report.ptuNumber || NO_PTU}`;
const pad = (n) => String(n).padStart(6, '0');

// One row per branch + terminal (PTU) for the whole selected period, built from the per-day rows.
function groupReports(reports = []) {
    return _.map(_.groupBy(reports, groupKey), (rows, key) => {
        const days = _.sortBy(rows, 'date');
        const first = days[0];
        const last = days[days.length - 1];
        const starts = days.map((r) => r.invoiceStartNumber).filter((n) => n != null);
        const ends = days.map((r) => r.invoiceEndNumber).filter((n) => n != null);
        const sum = (pick) => _.sumBy(days, (r) => pick(r) || 0);

        return {
            key,
            branch: first.branch,
            ptuNumber: first.ptuNumber,
            min: _.find(days, 'min')?.min,
            sn: _.find(days, 'sn')?.sn,
            days: days.length,
            invoiceStart: starts.length ? Math.min(...starts) : null,
            invoiceEnd: ends.length ? Math.max(...ends) : null,
            // opening fund of the first day, ending cash count of the last day
            openingFund: first.openingFund?.total,
            endingCashCount: last.endingCashCount?.total,
            grossSales: sum((r) => r.salesSummary?.grossSales),
            deductions: sum((r) => (r.salesSummary?.cancelled || 0) + (r.salesSummary?.refunded || 0)),
            discount: sum((r) => r.salesSummary?.discount),
            netSales: sum((r) => r.salesSummary?.netSales),
            firstDate: first.date,
            lastDate: last.date
        };
    });
}

const formatDates = (row) =>
    row.firstDate === row.lastDate
        ? moment(row.firstDate).format('YYYY-MM-DD')
        : `${moment(row.firstDate).format('YYYY-MM-DD')} – ${moment(row.lastDate).format('YYYY-MM-DD')}`;

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

    const groups = groupReports(sales);
    const pageRows = groups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Card sx={{ overflow: 'hidden' }}>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            {TABLE_HEADS.map((head, index) => (
                                <TableCell
                                    key={index}
                                    sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textWrap: 'nowrap' }}
                                >
                                    {head.toUpperCase()}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!isLoading && pageRows.length === 0 && (
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
                            pageRows.map((row) => (
                                <TableRow key={row.key} hover>
                                    <TableCell>
                                        <ExportRowButton
                                            loading={exportingKey === row.key}
                                            disabled={!!exportingKey}
                                            onClick={() =>
                                                onExport(
                                                    row.key,
                                                    {
                                                        // the export keeps one line per day, for this branch + terminal
                                                        ..._.pick(params, ['dateFilter', 'customDate', 'startDate', 'endDate']),
                                                        type: 'sales',
                                                        branchId: row.branch?._id,
                                                        ptuNumber: row.ptuNumber || NO_PTU
                                                    },
                                                    `annex_sales_summary-${_.kebabCase(row.branch?.name)}-${row.ptuNumber || 'no-ptu'}.xlsx`
                                                )
                                            }
                                        />
                                    </TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.branch?.name || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.ptuNumber || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.min || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.sn || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {row.invoiceStart != null ? `${pad(row.invoiceStart)} - ${pad(row.invoiceEnd)}` : '---'}
                                    </TableCell>
                                    <TableCell>{clip(row.endingCashCount)}</TableCell>
                                    <TableCell>{clip(row.openingFund)}</TableCell>
                                    <TableCell>{clip(row.grossSales)}</TableCell>
                                    <TableCell>{clip(row.deductions)}</TableCell>
                                    <TableCell>{clip(row.discount)}</TableCell>
                                    <TableCell>{clip(row.netSales)}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{formatDates(row)}</TableCell>
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
                count={groups.length}
                page={page}
                onPageChange={setPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(value) => {
                    setRowsPerPage(value);
                    setPage(0);
                }}
                itemLabel="terminals"
            />
        </Card>
    );
}

export default SalesReports;
