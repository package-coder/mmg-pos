import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Card,
    Button,
    Typography,
    TablePagination,
    CircularProgress,
    Stack,
    TextField,
    InputAdornment,
    IconButton,
    Avatar,
    Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useQuery } from 'react-query';
import { CSVLink } from 'react-csv';

// api
import transaction from 'api/transaction';

const HEAD_CELLS = [
    'Customer Name',
    'Lab Exam Done',
    'OR #',
    'Amount',
    'Packages',
    'Lab Services',
    'ECG Services',
    'XRAY Services',
    'UTZ Services',
    'Drug Test',
    'Send Out',
    'LAB Comm',
    'PF',
    'Discount',
    'Others',
    'Referee'
];

// Deterministic per-customer color so the same name always gets the same avatar color
// across page reloads/pagination, without needing to store a color on the record itself.
const AVATAR_COLORS = ['#5C6AC4', '#00848E', '#B98900', '#BF0711', '#00875A', '#6B4FBB', '#0B5FFF', '#B75A00'];
const colorForName = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase() || '?';

const getCustomerName = (row) =>
    row.customerData?.fullName || `${row.customerData?.firstName || ''} ${row.customerData?.lastName || ''}`.trim() || '---';

const getCategoryPrice = (row, name) => row.categories?.find((c) => c.name === name)?.price;
const getOthersPrice = (row) => row.categories?.find((c) => c.name?.startsWith('Others'))?.price;

const formatCurrency = (value) =>
    `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}`;

const DailyReport = ({ cashierId, branchId }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');

    const { data, isLoading, isError, error } = useQuery(
        ['transaction', cashierId, branchId],
        () => transaction.GetSales(cashierId, branchId),
        {
            enabled: !!cashierId // Only run the query if a transaction ID is set
        }
    );

    const generateCSVData = () => {
        const csvData = data?.cols?.map((row) => ({
            customerName: getCustomerName(row),
            labExams: row.labExams,
            orNo: row.invoiceNumber,
            amount: row.amount,
            package: getCategoryPrice(row, 'Package') || '---',
            labServices: getCategoryPrice(row, 'Laboratory Services') || '---',
            ecgServices: getCategoryPrice(row, 'ECG Services') || '---',
            xrayServices: getCategoryPrice(row, 'X-RAY Services') || '---',
            utzServices: getCategoryPrice(row, 'UTZ') || '---',
            drugTest: getCategoryPrice(row, 'Drug Test') || '---',
            sendOut: getCategoryPrice(row, 'Send Out') || '---',
            labComm: getCategoryPrice(row, 'LAB Comm') || '---',
            pf: getCategoryPrice(row, 'PF') || '---',
            discount: row.discount || '---',
            others: getOthersPrice(row) || '---',
            referrer: row.referrer || '---'
        }));

        return csvData;
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (event) => {
        setSearch(event.target.value);
        setPage(0);
    };

    const filteredRows = (data?.cols || []).filter((row) => {
        if (!search) return true;
        const query = search.toLowerCase();
        return (
            getCustomerName(row).toLowerCase().includes(query) ||
            String(row.invoiceNumber || '').includes(query) ||
            (row.labExams || '').toLowerCase().includes(query)
        );
    });

    const pagedRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const sumOf = (getValue) => pagedRows.reduce((sum, row) => sum + (parseFloat(getValue(row)) || 0), 0);

    if (isLoading) {
        return (
            <Stack direction="column" justifyContent="center" alignItems="center" spacing={2}>
                <CircularProgress />
            </Stack>
        );
    }

    if (isError) {
        return <Typography color="error">{error.message}</Typography>;
    }

    return (
        <Paper sx={{ padding: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={3}>
                <Typography variant="h3" gutterBottom mb={3}>
                    Daily Sales Report
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <CSVLink
                        data={generateCSVData()}
                        headers={[
                            { label: 'Customer Name', key: 'customerName' },
                            { label: 'Lab Exam Done', key: 'labExams' },
                            { label: 'OR', key: 'orNo' },
                            { label: 'Amount', key: 'amount' },
                            { label: 'Packages', key: 'packages' },
                            { label: 'Lab Services', key: 'labServices' },
                            { label: 'ECG Services', key: 'ecgServices' },
                            { label: 'XRAY Services', key: 'xrayServices' },
                            { label: 'UTZ Services', key: 'utzServices' },
                            { label: 'Drug Test', key: 'drugTest' },
                            { label: 'Send Out', key: 'sendOut' },
                            { label: 'LAB Comm', key: 'labComm' },
                            { label: 'PF', key: 'pf' },
                            { label: 'Discount', key: 'discount' },
                            { label: 'Others', key: 'others' },
                            { label: 'Referee', key: 'referrer' }
                        ]}
                        filename="daily_sales_report.csv"
                        style={{ textDecoration: 'none' }}
                    >
                        <Button variant="outlined" color="primary" startIcon={<PrintIcon />}>
                            Download CSV
                        </Button>
                    </CSVLink>
                </Stack>
            </Stack>

            <TextField
                value={search}
                onChange={handleSearchChange}
                size="small"
                fullWidth
                placeholder="Search Customer Name, Lab Exam, or OR #..."
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                    ),
                    endAdornment: search ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearch('')}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : null
                }}
            />

            <Card sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                {HEAD_CELLS.map((head) => (
                                    <TableCell
                                        key={head}
                                        sx={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: 'text.secondary',
                                            letterSpacing: 0.5,
                                            textWrap: 'nowrap'
                                        }}
                                    >
                                        {head.toUpperCase()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pagedRows.map((row, index) => (
                                <TableRow key={row.invoiceNumber || index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                            <Avatar
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    fontSize: '0.75rem',
                                                    bgcolor: colorForName(getCustomerName(row))
                                                }}
                                            >
                                                {getInitials(getCustomerName(row))}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight={600} sx={{ textWrap: 'nowrap' }}>
                                                {getCustomerName(row)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>{row.labExams}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {row.invoiceNumber ? (
                                            <Chip
                                                size="small"
                                                label={`#${String(row.invoiceNumber).padStart(6, '0')}`}
                                                sx={{ bgcolor: 'grey.100', fontWeight: 600, fontSize: '0.7rem' }}
                                            />
                                        ) : (
                                            '---'
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        <Typography variant="body2" fontWeight={700}>
                                            {formatCurrency(row.amount)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{getCategoryPrice(row, 'Package') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'Laboratory Services') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'ECG Services') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'X-RAY Services') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'UTZ') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'Drug Test') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'Send Out') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'LAB Comm') || '---'}</TableCell>
                                    <TableCell>{getCategoryPrice(row, 'PF') || '---'}</TableCell>
                                    <TableCell>{row.discount || '---'}</TableCell>
                                    <TableCell>{getOthersPrice(row) || '---'}</TableCell>
                                    <TableCell>{row.referrer || '---'}</TableCell>
                                </TableRow>
                            ))}
                            {pagedRows.length > 0 && (
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700}>
                                            PAGE TOTAL ({pagedRows.length} ITEM{pagedRows.length === 1 ? '' : 'S'})
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            Subtotal for current page
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {pagedRows.length} Receipt{pagedRows.length === 1 ? '' : 's'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        <Typography variant="body2" fontWeight={700} color="primary.dark">
                                            {formatCurrency(sumOf((row) => row.amount))}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'Package')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'Laboratory Services')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'ECG Services')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'X-RAY Services')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'UTZ')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'Drug Test')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'Send Out')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'LAB Comm')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getCategoryPrice(row, 'PF')))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => row.discount))}</TableCell>
                                    <TableCell>{formatCurrency(sumOf((row) => getOthersPrice(row)))}</TableCell>
                                    <TableCell />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {!pagedRows.length && (
                        <Stack alignItems="center" py={6}>
                            <Typography color="text.secondary" variant="h5">
                                {search ? 'No transactions match your search' : 'No data available for this table'}
                            </Typography>
                        </Stack>
                    )}
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredRows.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
            </Card>
        </Paper>
    );
};

export default DailyReport;
