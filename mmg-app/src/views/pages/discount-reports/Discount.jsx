import { Stack, Typography, TableContainer, TableHead, TableRow, TableBody, TableCell, Table, Card, CircularProgress } from '@mui/material';
import { useQuery } from 'react-query';
import _, { upperCase } from 'lodash';
import moment from 'moment';
import { useState } from 'react';
import discount_report from 'api/discount_report';
import ReportPagination from 'ui-component/ReportPagination';
import ExportRowButton from './ExportRowButton';

const TABLE_HEADS = [
    'Branch',
    'PTU No.',
    'MIN',
    'SN',
    'Invoice Range #',
    'Member Type',
    'Records',
    'Gross Sales',
    'Member Discount',
    'Total Discount',
    'Net Sales',
    'Date',
    ''
];

const NO_PTU = '-';
const groupKey = (row) => `${row.branch?._id}|${row.transaction?.ptuNumber || NO_PTU}`;
const pad = (n) => String(n).padStart(6, '0');
const day = (value) => moment(value).format('YYYY-MM-DD');

// One row per branch + terminal (PTU): the member discounts of the whole period, rolled up.
function groupDiscounts(discounts = []) {
    return _.map(_.groupBy(discounts, groupKey), (rows, key) => {
        const first = rows[0];
        const invoices = rows.map((r) => r.transaction?.invoiceNumber).filter((n) => n != null);
        const dates = rows.map((r) => r.transaction?.transactionDate).filter(Boolean).sort();
        const sum = (pick) => _.sumBy(rows, (r) => pick(r.transaction) || 0);

        return {
            key,
            branch: first.branch,
            ptuNumber: first.transaction?.ptuNumber,
            min: _.find(rows, 'transaction.min')?.transaction.min,
            sn: _.find(rows, 'transaction.sn')?.transaction.sn,
            records: rows.length,
            invoiceStart: invoices.length ? Math.min(...invoices) : null,
            invoiceEnd: invoices.length ? Math.max(...invoices) : null,
            grossSales: sum((t) => t.totalGrossSales),
            memberDiscount: sum((t) => t.totalMemberDiscount),
            totalDiscount: sum((t) => t.totalDiscount),
            netSales: sum((t) => t.totalNetSales),
            firstDate: dates[0],
            lastDate: dates[dates.length - 1]
        };
    });
}

const formatDates = (row) =>
    !row.firstDate ? '---' : day(row.firstDate) === day(row.lastDate) ? day(row.firstDate) : `${day(row.firstDate)} – ${day(row.lastDate)}`;

function DiscountReports({ generated, onExport, exportingKey, ...initialParams }) {
    const params = _.pickBy(
        {
            ...initialParams,
            status: 'completed'
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

    const groups = groupDiscounts(discounts);
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
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.branch?.name || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.ptuNumber || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.min || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{row.sn || '---'}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {row.invoiceStart != null ? `${pad(row.invoiceStart)} - ${pad(row.invoiceEnd)}` : '---'}
                                    </TableCell>
                                    <TableCell>{upperCase(initialParams.memberType)}</TableCell>
                                    <TableCell>{row.records}</TableCell>
                                    <TableCell>{row.grossSales.toFixed(2)}</TableCell>
                                    <TableCell>{row.memberDiscount.toFixed(2)}</TableCell>
                                    <TableCell>{row.totalDiscount.toFixed(2)}</TableCell>
                                    <TableCell>{row.netSales.toFixed(2)}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{formatDates(row)}</TableCell>
                                    <TableCell>
                                        <ExportRowButton
                                            loading={exportingKey === row.key}
                                            disabled={!!exportingKey}
                                            onClick={() =>
                                                onExport(
                                                    row.key,
                                                    {
                                                        // every discount of this branch + terminal in the period
                                                        ..._.pick(params, ['dateFilter', 'customDate', 'startDate', 'endDate']),
                                                        type: 'discounts',
                                                        memberType: initialParams.memberType,
                                                        branchId: row.branch?._id,
                                                        ptuNumber: row.ptuNumber || NO_PTU
                                                    },
                                                    `annex-${String(initialParams.memberType).replace('_', '-')}-${_.kebabCase(row.branch?.name)}-${row.ptuNumber || 'no-ptu'}.xlsx`
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

export default DiscountReports;
