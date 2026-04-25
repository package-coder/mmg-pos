import {
    Stack,
    TextField,
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
    MenuItem,
    Box,
    Button,
    TablePagination
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { omit, pick, startCase } from 'lodash';
import MainCard from 'ui-component/cards/MainCard';
import auditLog from 'api/audit_logs';
import { useCallback, useState } from 'react';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { useAuth } from 'providers/AuthProvider';
import Role from 'utils/Role';
import { DateFilterEnum, DateFilterOptions } from 'ui-component/filter/DateFilter';
import generateReportFilename from 'utils/generateReportFilename';
import { CSVLink } from 'react-csv';
import moment from 'moment';

const DEFAULT_FILTER = 'all';

function AuditLogsPage() {
    const { branch, user, matchRole } = useAuth();
    const [dateFilter, setDateFilter] = useState(DateFilterEnum.TODAY);
    const [customDate, setCustomDate] = useState({});

    const fileName = generateReportFilename('audit-logs', { dateFilter, customDate }) + '.csv';

    const params = _.pickBy(
        {
            dateFilter: dateFilter,
            customDate: customDate?.date?.format('YYYY-MM-DD'),
            startDate: customDate?.startDate?.format('YYYY-MM-DD'),
            endDate: customDate?.endDate?.format('YYYY-MM-DD')
        },
        (value) => value != null
    );  

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs', dateFilter, customDate], 
        queryFn: () => auditLog.GetAllLogs(params),
    });

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const exportToCSV = useCallback(() => {
        let data = logs.map((item) => ({
            ...omit(item, ['user', 'data', 'error', 'ipaddress']),
            action: item.action.name,
            data: item.data ? Object.entries(item.data).map(([key, value]) => `${key}:${value}`).join('; ') : null,
            user: startCase(`${item.user?.first_name} ${item.user?.last_name}`),
        }));

        const header = Object.keys(data?.[0]).map((item) => startCase(item));
        data = data.map((item) => Object.values(item));

        return [header, ...data];
    }, [logs]);


    const resetFilters = () => {
        setDateFilter(DateFilterEnum.TODAY);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const renderTable = (children) => (
        <MainCard title="Audit Logs">
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <Stack mb={1} spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <TextField
                        select
                        size="small"
                        label="Date"
                        value={dateFilter}
                        onChange={(e) => {
                            setDateFilter(e?.target?.value);
                            setCustomDate({});
                        }}
                        sx={{ minWidth: 200 }}
                    >
                        {DateFilterOptions.map((option) => (
                            <MenuItem value={option.value}>{option.label}</MenuItem>
                        ))}
                    </TextField>
                    {dateFilter == DateFilterEnum.CUSTOM_DATE && (
                        <DatePicker
                            label="Custom Date"
                            disableFuture
                            value={customDate?.date}
                            onAccept={(value) => setCustomDate((date) => ({ ...date, date: value }))}
                            views={['year', 'month']}
                            slotProps={{
                                textField: { size: 'small' },
                                actionBar: {
                                    actions: ['clear', 'today', 'accept']
                                }
                            }}
                        />
                    )}
                    {dateFilter == DateFilterEnum.CUSTOM_FILTER && (
                        <>
                            <DatePicker
                                disableFuture
                                value={customDate?.startDate}
                                onAccept={(value) => setCustomDate((date) => ({ ...date, startDate: value }))}
                                openTo="year"
                                views={['year', 'month', 'day']}
                                slotProps={{
                                    textField: { size: 'small' },
                                    actionBar: {
                                        actions: ['clear', 'today', 'accept']
                                    }
                                }}
                                label="Start Date"
                            />
                            <DatePicker
                                disableFuture
                                disabled={!customDate?.startDate}
                                onAccept={(value) => setCustomDate((date) => ({ ...date, endDate: value }))}
                                openTo="year"
                                shouldDisableDate={(date) => customDate?.startDate?.isAfter(date, 'date')}
                                shouldDisableMonth={(month) => customDate.startDate?.isAfter(month, 'month')}
                                shouldDisableYear={(year) => customDate.startDate?.isAfter(year, 'year')}
                                views={['year', 'month', 'day']}
                                slotProps={{
                                    textField: { size: 'small' },
                                    actionBar: {
                                        actions: ['clear', 'today', 'accept']
                                    }
                                }}
                                label="End Date"
                            />
                        </>
                    )}
                    <Button variant="contained" onClick={resetFilters}>
                        Reset
                    </Button>
                    <Box flex={1} />
                    {!logs || logs?.length == 0 || isLoading ? (
                        <Button variant="outlined" disabled>
                            Export CSV
                        </Button>
                    ) : (
                        <CSVLink data={exportToCSV()} filename={fileName} style={{ textDecoration: 'none' }}>
                            <Button variant="outlined">Export CSV</Button>
                        </CSVLink>
                    )}
                </Stack>
            </LocalizationProvider>

            <Card sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <TableContainer component={Paper}>
                    <Table sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: "20%" }}>Action</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell width='40%'>Data</TableCell>
                                <TableCell>Message</TableCell>
                                <TableCell>Date & Time</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!isLoading && logs?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                                <TableRow key={log._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ width: "20%" }} component="th" scope="row">
                                        {log.action.name}
                                    </TableCell>
                                    <TableCell>{startCase(`${log.user?.first_name} ${log.user?.last_name}`)}</TableCell>
                                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'none' }}>{log.data ? JSON.stringify(log.data) : ''}</TableCell>
                                    <TableCell>{log.message}</TableCell>
                                    <TableCell>{moment(log.datetime).format('YYYY-MM-DD hh:mmA')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {children}
                </TableContainer>
                <div style={{ flex: '0 1 auto' }}>
                    <TablePagination
                        component="div"
                        count={logs?.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </div>
            </Card>
        </MainCard>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (isLoading) {
        return renderTable(renderMessage(<CircularProgress size={28} />));
    }

    if (!logs || logs.length === 0) {
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

export default AuditLogsPage;
