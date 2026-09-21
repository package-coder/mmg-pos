import React, { useState, useEffect } from 'react';
import {
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Stack,
    TextField,
    MenuItem,
    Box,
    Chip,
    Avatar,
    IconButton,
    TablePagination,
    CircularProgress,
    Tooltip,
    Card
} from '@mui/material';
import { MdUndo } from 'react-icons/md';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import moment from 'moment';
import { useQuery } from 'react-query';
import { startCase, toLower, upperCase } from 'lodash';
import transaction from 'api/transaction';
import Currency from 'ui-component/Currency';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { useAuth } from 'providers/AuthProvider';

const DEFAULT_FILTER = 'all';
const DateFilter = Object.freeze({
    ALL: 0,
    TODAY: 1,
    YESTERDAY: 2,
    THIS_WEEK: 3,
    THIS_MONTH: 4,
    THIS_YEAR: 5,
    LAST_WEEK: 6,
    LAST_MONTH: 7,
    LAST_YEAR: 8,
    CUSTOM_FILTER: 9,
    CUSTOM_DATE: 10
});

const DateFilterOptions = [
    { value: DateFilter.ALL, label: 'All' },
    { value: DateFilter.TODAY, label: 'Today' },
    { value: DateFilter.YESTERDAY, label: 'Yesterday' },
    { value: DateFilter.THIS_WEEK, label: 'This Week' },
    { value: DateFilter.THIS_MONTH, label: 'This Month' },
    { value: DateFilter.THIS_YEAR, label: 'This Year' },
    { value: DateFilter.LAST_WEEK, label: 'Last Week' },
    { value: DateFilter.LAST_MONTH, label: 'Last Month' },
    { value: DateFilter.LAST_YEAR, label: 'Last Year' },
    { value: DateFilter.CUSTOM_DATE, label: 'Custom Date' },
    { value: DateFilter.CUSTOM_FILTER, label: 'Custom Filter' }
];

const STATUS_COLOR = {
    completed: 'success',
    hold: 'info'
};

// Deterministic pastel avatar color derived from the record's own id, stable across reloads.
const stringToAvatarColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str?.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return { bg: `hsl(${hue}, 70%, 92%)`, color: `hsl(${hue}, 55%, 38%)` };
};

const getInitials = (name) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

const TransactionsSlideBar = ({ onRestoreTransaction }) => {
    const { branch } = useAuth();

    const { data, isLoading, isRefetching, isError, error } = useQuery(['transactions', branch?.id], () =>
        transaction.GetAllTransaction({ branchId: branch?.id })
    );

    const [searchFilter, setSearchFilter] = useState('');
    const [transactions, setTransactions] = useState(data);
    const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTER);
    const [dateFilter, setDateFilter] = useState(DateFilter.TODAY);
    const [customDateFilter, setCustomDateFilter] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        let filtered = data || [];

        if (statusFilter && statusFilter != DEFAULT_FILTER) filtered = filtered?.filter((t) => t.status == statusFilter);

        if (dateFilter && dateFilter != DateFilter.ALL) {
            filtered = filtered?.filter((t) => {
                const date = moment(t?.transactionDate);
                const today = moment();

                switch (dateFilter) {
                    case DateFilter.TODAY:
                        return date.isSame(today, 'date');
                    case DateFilter.YESTERDAY:
                        return date.isSame(today.subtract(1, 'day'), 'date');
                    case DateFilter.THIS_WEEK:
                        return date.isSame(today, 'week');
                    case DateFilter.THIS_MONTH:
                        return date.isSame(today, 'month');
                    case DateFilter.THIS_YEAR:
                        return date.isSame(today, 'year');
                    case DateFilter.LAST_WEEK:
                        return date.isSame(today.subtract(1, 'week'), 'week');
                    case DateFilter.LAST_MONTH:
                        return date.isSame(today.subtract(1, 'month'), 'month');
                    case DateFilter.LAST_YEAR:
                        return date.isSame(today.subtract(1, 'year'), 'year');
                    case DateFilter.CUSTOM_DATE:
                        if (!customDateFilter.date) return true;
                        return date.isSame(customDateFilter.date, 'month');
                    case DateFilter.CUSTOM_FILTER:
                        if (!customDateFilter.startDate || !customDateFilter.endDate) return true;
                        return (
                            date?.isSameOrAfter(customDateFilter.startDate, 'date') &&
                            date?.isSameOrBefore(customDateFilter.startDate, 'date')
                        );
                    default:
                        return true;
                }
            });
        }
        if (searchFilter) {
            filtered = filtered?.filter(
                (t) =>
                    t?.transactionNo?.startsWith(searchFilter) ||
                    t?.invoiceNumber?.toString().startsWith(searchFilter) ||
                    toLower(t?.customer?.firstName)?.startsWith(toLower(searchFilter)) ||
                    toLower(t?.customer?.lastName)?.startsWith(toLower(searchFilter))
            );
        }

        setTransactions(filtered);
        setPage(0);
    }, [data, dateFilter, statusFilter, searchFilter]);

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const resetFilters = () => {
        setSearchFilter('');
        setStatusFilter(DEFAULT_FILTER);
        setDateFilter(DateFilter.TODAY);
        setCustomDateFilter({});
    };

    const paginated = (transactions || []).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const renderEmptyState = () => (
        <Stack alignItems="center" py={6}>
            <Typography color="text.secondary" variant="h5">
                No transactions to display. Try checking your filters
            </Typography>
        </Stack>
    );

    if (isError) {
        return <Typography color="error">{error.message}</Typography>;
    }

    return (
        <Stack spacing={2.5}>
            <Card>
                <Box
                    sx={{
                        px: 3,
                        py: 2.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}
                >
                    <Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="h2" fontWeight={600}>
                                Transaction History
                            </Typography>
                            <Chip
                                size="small"
                                label={`${(transactions?.length || 0).toLocaleString()} transactions`}
                                sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 500 }}
                            />
                            {isRefetching && <CircularProgress size={16} />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {branch?.name ? `${startCase(branch.name)} — ` : ''}View past sales and restore held transactions.
                        </Typography>
                    </Box>
                </Box>
            </Card>

            <Card>
                <Box sx={{ px: 3, py: 2.5 }}>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <Stack
                            spacing={1.5}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            flexWrap="wrap"
                            useFlexGap
                        >
                            <TextField
                                size="small"
                                placeholder="Search by invoice no. or customer name..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target?.value)}
                                sx={{ flex: 1, minWidth: 260 }}
                                InputProps={{
                                    startAdornment: <SearchIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                                    endAdornment: searchFilter ? (
                                        <IconButton size="small" onClick={() => setSearchFilter('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    ) : null
                                }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e?.target?.value)}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value={DEFAULT_FILTER}>
                                    <em>All</em>
                                </MenuItem>
                                {data &&
                                    Object.keys(Object.groupBy(data, ({ status }) => status))
                                        .filter((key) => !!key && key != 'undefined')
                                        .map((status) => (
                                            <MenuItem key={status} value={status}>
                                                {startCase(status)}
                                            </MenuItem>
                                        ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e?.target?.value);
                                    setCustomDateFilter({});
                                }}
                                sx={{ minWidth: 160 }}
                            >
                                {DateFilterOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {dateFilter == DateFilter.CUSTOM_DATE && (
                                <DatePicker
                                    label="Custom Date"
                                    disableFuture
                                    value={customDateFilter?.date}
                                    onAccept={(value) => setCustomDateFilter((date) => ({ ...date, date: value }))}
                                    views={['year', 'month']}
                                    slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
                                />
                            )}
                            {dateFilter == DateFilter.CUSTOM_FILTER && (
                                <>
                                    <DatePicker
                                        disableFuture
                                        value={customDateFilter?.startDate}
                                        onAccept={(value) => setCustomDateFilter((date) => ({ ...date, startDate: value }))}
                                        openTo="year"
                                        views={['year', 'month', 'day']}
                                        slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
                                        label="Start Date"
                                    />
                                    <DatePicker
                                        disableFuture
                                        disabled={!customDateFilter?.startDate}
                                        onAccept={(value) => setCustomDateFilter((date) => ({ ...date, endDate: value }))}
                                        openTo="year"
                                        shouldDisableDate={(date) => customDateFilter?.startDate?.isAfter(date, 'date')}
                                        shouldDisableMonth={(month) => customDateFilter.startDate?.isAfter(month, 'month')}
                                        shouldDisableYear={(year) => customDateFilter.startDate?.isAfter(year, 'year')}
                                        views={['year', 'month', 'day']}
                                        slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
                                        label="End Date"
                                    />
                                </>
                            )}
                            <Button variant="outlined" color="inherit" onClick={resetFilters}>
                                Reset
                            </Button>
                        </Stack>
                    </LocalizationProvider>
                </Box>
            </Card>

            <Card sx={{ overflow: 'hidden' }}>
                <TableContainer style={{ maxHeight: 'calc(100vh - 380px)' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                {[
                                    'Action',
                                    'Invoice #',
                                    'Serial #',
                                    'Adjustment Ref #',
                                    'Date',
                                    'Status',
                                    'Cashier',
                                    'Customer',
                                    'Gross Sale',
                                    'Member Discount',
                                    'Net Sale'
                                ].map((head) => (
                                    <TableCell
                                        key={head}
                                        sx={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: 'text.secondary',
                                            letterSpacing: 0.5,
                                            textWrap: 'nowrap',
                                            bgcolor: 'grey.50'
                                        }}
                                    >
                                        {head.toUpperCase()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!isLoading && paginated.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11}>{renderEmptyState()}</TableCell>
                                </TableRow>
                            )}
                            {!isLoading &&
                                paginated.map((t) => {
                                    const isAdjustment = ['cancelled', 'refunded'].includes(t.status) && t.serialNumber;
                                    const avatarColor = stringToAvatarColor(t.customer?._id || t._id);
                                    return (
                                        <TableRow key={t._id} hover>
                                            <TableCell>
                                                <Tooltip
                                                    title={
                                                        t?.status === 'hold'
                                                            ? 'Restore held transaction'
                                                            : 'Only held transactions can be restored'
                                                    }
                                                >
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onRestoreTransaction(t)}
                                                            disabled={t?.status !== 'hold'}
                                                            aria-label="Restore held transaction"
                                                        >
                                                            <MdUndo />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {t.invoiceNumber != null && (t.status == 'completed' || !t.serialNumber)
                                                    ? String(t.invoiceNumber).padStart(6, '0')
                                                    : '---'}
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {t.status == 'completed' || !t.serialNumber
                                                    ? '---'
                                                    : String(t.serialNumber).padStart(6, '0')}
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {isAdjustment ? String(t.invoiceNumber).padStart(6, '0') : '---'}
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {moment(t.transactionDate).format('YYYY-MM-DD hh:mmA')}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={upperCase(t.status)}
                                                    size="small"
                                                    variant="outlined"
                                                    color={STATUS_COLOR[t.status] || 'error'}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>{t.cashier?.name}</TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Avatar
                                                        sx={{
                                                            width: 26,
                                                            height: 26,
                                                            fontSize: '0.7rem',
                                                            bgcolor: avatarColor.bg,
                                                            color: avatarColor.color,
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {getInitials(t.customer?.name)}
                                                    </Avatar>
                                                    <Typography variant="body2">{t.customer?.name}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {!['cancelled', 'refunded'].includes(t.status) || !t.serialNumber ? (
                                                    <Currency value={t.totalSalesWithoutMemberDiscount ?? 0} />
                                                ) : (
                                                    '---'
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {!['cancelled', 'refunded'].includes(t.status) || !t.serialNumber ? (
                                                    <Currency value={t.totalMemberDiscount ?? 0} />
                                                ) : (
                                                    '---'
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                                {t.status != 'cancelled' || !t.serialNumber ? (
                                                    <Currency value={t.totalNetSales ?? 0} />
                                                ) : (
                                                    '---'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                    {isLoading && (
                        <Stack alignItems="center" py={6}>
                            <CircularProgress size={28} />
                        </Stack>
                    )}
                </TableContainer>
                <TablePagination
                    component="div"
                    count={transactions?.length || 0}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
            </Card>
        </Stack>
    );
};

export default TransactionsSlideBar;
