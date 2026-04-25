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
    Chip,
    MenuItem,
    Box,
    Button,
    TablePagination
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { omit, pick, startCase, toLower, upperCase } from 'lodash';
import MainCard from 'ui-component/cards/MainCard';
import transaction from 'api/transaction';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { useAuth } from 'providers/AuthProvider';
import Currency from 'ui-component/Currency';
import BranchFilter from 'ui-component/filter/BranchFilter';
import Role from 'utils/Role';
import { DateFilterEnum, DateFilterOptions } from 'ui-component/filter/DateFilter';
import generateReportFilename from 'utils/generateReportFilename';
import { CSVLink } from 'react-csv';
import discount_report from 'api/discount_report';
import SalesReports from './Sales';
import DiscountReports from './Discount';

const DEFAULT_FILTER = 'all';

export const ReportTypeEnum = Object.freeze({
    SALES: 0,
    DISCOUNTS: 1
});



function Reports() {
    const { branch, user, matchRole } = useAuth();
    const [dateFilter, setDateFilter] = useState(DateFilterEnum.ALL);
    const [customDate, setCustomDate] = useState({});
    const [reportType, setReportType] = useState('');
    const [memberType, setMemberType] = useState('');
    const [generated, setGenerated] = useState(0)
    const [downloading, setDownloading] = useState(false);


    const hasOnlyOneBranch = user?.branches?.length == 1;
    const hasMultipleBranch = user?.branches?.length > 1;

    const [branchFilter, setBranchFilter] = useState(
        matchRole(Role.ADMIN) || hasMultipleBranch ? DEFAULT_FILTER : branch?.name
    );

    const fileName = generateReportFilename(`annex-${memberType.replace('_', '-')}-discount-reports`, { dateFilter, customDate }) + '.xlsx';

    const params = _.pickBy(
            {
                dateFilter: dateFilter,
                customDate: customDate?.date?.format('YYYY-MM-DD'),
                startDate: customDate?.startDate?.format('YYYY-MM-DD'),
                endDate: customDate?.endDate?.format('YYYY-MM-DD'),
                memberType
            },
            (value) => value != null
        );  

    const resetFilters = () => {
        setBranchFilter(DEFAULT_FILTER);
        setDateFilter(DateFilterEnum.ALL);
        setGenerated(0)
        setReportType('')
    };


   
    const renderTable = (children) => (
        <MainCard title="BIR Reports">
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <Stack mb={2} spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    {/* <BranchFilter 
                        filter={branchFilter}
                        onChange={(value) => setBranchFilter(value)}
                        values={data}
                        setValues={setTransactions}
                        {...(matchRole(Role.CASHIER)
                            ? {
                                    options: user?.branches?.map((branch) => branch.name),
                                    disabled: hasOnlyOneBranch
                                }
                            : {})}
                    /> */}
                    <TextField
                        select
                        size="small"
                        label="ReportType"
                        value={reportType}
                        onChange={e => {
                            setGenerated(0)
                            setReportType(e.target.value)
                        }}
                        sx={{ minWidth: 200 }}
                    >
                        {['sales', 'discounts'].map((option, index) => <MenuItem key={index} value={option}>{startCase(option)}</MenuItem>)}
                    </TextField>
                    {reportType === 'discounts' && (
                        <TextField
                            select
                            size="small"
                            label="Member Type"
                            value={memberType}
                            onChange={(e) => {
                                setGenerated(0)
                                setMemberType(e?.target?.value)
                            }}
                            sx={{ minWidth: 200 }}
                        >
                            {/* <MenuItem value='all'>
                                <em>All</em>
                            </MenuItem> */}
                            {['senior_citizen', 'NAAC', 'PWD', 'solo_parent'].map((option) => (
                                <MenuItem key={option} value={option.toLowerCase()}>
                                    {startCase(option)}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <TextField
                        select
                        size="small"
                        label="Date"
                        value={dateFilter}
                        onChange={(e) => {
                            setGenerated(0)
                            setDateFilter(e?.target?.value);
                            setCustomDate({});
                        }}
                        sx={{ minWidth: 200 }}
                    >
                        {DateFilterOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
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
                    <Button sx={{ alignSelf: 'stretch' }} variant="contained" onClick={resetFilters}>
                        Reset
                    </Button>
                    <Box flex={1} />
                    <Button 
                        disabled={(reportType === '') || (reportType == 'discounts' && memberType === '')} 
                        sx={{ alignSelf: 'stretch' }} 
                        variant="contained" 
                        onClick={() => {
                            setGenerated(value => ++value)
                        }}
                    >
                        Generate
                    </Button>
                    <Button 
                        sx={{ alignSelf: 'stretch' }} 
                        variant="outlined" 
                        disabled={!generated || downloading}
                        onClick={async () => {
                            let data = null
                            try {
                                setDownloading(true)
                                data = await discount_report.DownloadReport({ ...params, type: reportType })
                            } finally {
                                setDownloading(false)
                            }
                            const url = URL.createObjectURL(data);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = reportType == 'sales' ? 'annex_sales_summary.xlsx' : fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                    >
                        {downloading ? 'Downloading...' : ' Export CSV'}  
                    </Button>
                </Stack>
            </LocalizationProvider>
            
           {generated > 0 && reportType == 'sales' && <SalesReports {...params} generated={generated}/>}
           {generated > 0 && reportType == 'discounts' && <DiscountReports {...params} generated={generated}/>}
        </MainCard>
    );


    return renderTable();
}

export default Reports;
