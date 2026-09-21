import { Stack, TextField, Typography, Card, MenuItem, Box, Button } from '@mui/material';
import _, { startCase } from 'lodash';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DateFilterEnum, DateFilterOptions } from 'ui-component/filter/DateFilter';
import discount_report from 'api/discount_report';
import SalesReports from './Sales';
import DiscountReports from './Discount';

export const ReportTypeEnum = Object.freeze({
    SALES: 0,
    DISCOUNTS: 1
});



function Reports() {
    const [dateFilter, setDateFilter] = useState(DateFilterEnum.ALL);
    const [customDate, setCustomDate] = useState({});
    const [reportType, setReportType] = useState('');
    const [memberType, setMemberType] = useState('');
    const [branchId, setBranchId] = useState('');
    const [ptuNumber, setPtuNumber] = useState('');
    const [generated, setGenerated] = useState(0);

    const { data: terminals = [] } = useQuery({
        queryKey: ['report-terminals'],
        queryFn: discount_report.GetTerminals,
        refetchOnWindowFocus: false
    });
    const branches = useMemo(() => _.uniqBy(terminals, 'branchId'), [terminals]);
    const branchTerminals = useMemo(() => terminals.filter((t) => !branchId || t.branchId === branchId), [terminals, branchId]);

    const params = _.pickBy(
        {
            dateFilter: dateFilter,
            customDate: customDate?.date?.format('YYYY-MM-DD'),
            startDate: customDate?.startDate?.format('YYYY-MM-DD'),
            endDate: customDate?.endDate?.format('YYYY-MM-DD'),
            memberType,
            branchId,
            ptuNumber
        },
        (value) => value != null && value !== ''
    );

    const resetFilters = () => {
        setDateFilter(DateFilterEnum.ALL);
        setCustomDate({});
        setGenerated(0);
        setReportType('');
        setMemberType('');
        setBranchId('');
        setPtuNumber('');
    };

    // Per-row export: `rowParams` narrows the download to that one row's branch/terminal/day.
    const [exportingKey, setExportingKey] = useState(null);
    const handleExportRow = async (key, rowParams, downloadName) => {
        try {
            setExportingKey(key);
            const data = await discount_report.DownloadReport(rowParams);
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExportingKey(null);
        }
    };

    const renderHeader = () => (
        <Card>
            <Box sx={{ px: 3, py: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h2" fontWeight={600}>
                        BIR Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Generate Annex-format sales and member discount summaries for BIR filing. Use the export button on a row to download it.
                    </Typography>
                </Box>
            </Box>
        </Card>
    );

    const renderFilters = () => (
        <Card>
            <Box sx={{ px: 3, py: 2.5 }}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                    <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" useFlexGap>
                        <TextField
                            select
                            size="small"
                            label="Report Type"
                            value={reportType}
                            onChange={(e) => {
                                setGenerated(0);
                                setReportType(e.target.value);
                            }}
                            sx={{ minWidth: 180 }}
                        >
                            {['sales', 'discounts'].map((option, index) => (
                                <MenuItem key={index} value={option}>
                                    {startCase(option)}
                                </MenuItem>
                            ))}
                        </TextField>
                        {reportType === 'discounts' && (
                            <TextField
                                select
                                size="small"
                                label="Member Type"
                                value={memberType}
                                onChange={(e) => {
                                    setGenerated(0);
                                    setMemberType(e?.target?.value);
                                }}
                                sx={{ minWidth: 180 }}
                            >
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
                            label="Branch"
                            value={branchId}
                            onChange={(e) => {
                                setGenerated(0);
                                setBranchId(e.target.value);
                                setPtuNumber('');
                            }}
                            sx={{ minWidth: 180 }}
                        >
                            <MenuItem value="">All branches</MenuItem>
                            {branches.map((b) => (
                                <MenuItem key={b.branchId} value={b.branchId}>
                                    {b.branchName}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="PTU No."
                            value={ptuNumber}
                            onChange={(e) => {
                                setGenerated(0);
                                setPtuNumber(e.target.value);
                            }}
                            sx={{ minWidth: 200 }}
                        >
                            <MenuItem value="">All terminals</MenuItem>
                            {branchTerminals.map((t) => (
                                <MenuItem key={`${t.branchId}-${t.ptuNumber}`} value={t.ptuNumber}>
                                    {t.ptuNumber}
                                    {!branchId && ` (${t.branchName})`}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Date"
                            value={dateFilter}
                            onChange={(e) => {
                                setGenerated(0);
                                setDateFilter(e?.target?.value);
                                setCustomDate({});
                            }}
                            sx={{ minWidth: 180 }}
                        >
                            {DateFilterOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {dateFilter == DateFilterEnum.CUSTOM_DATE && (
                            <DatePicker
                                label="Custom Date"
                                disableFuture
                                value={customDate?.date}
                                onAccept={(value) => setCustomDate((date) => ({ ...date, date: value }))}
                                views={['year', 'month']}
                                slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
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
                                    slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
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
                                    slotProps={{ textField: { size: 'small' }, actionBar: { actions: ['clear', 'today', 'accept'] } }}
                                    label="End Date"
                                />
                            </>
                        )}
                        <Button variant="contained" color="inherit" onClick={resetFilters}>
                            Reset
                        </Button>
                        <Box flex={1} />
                        <Button
                            disabled={reportType === '' || (reportType == 'discounts' && memberType === '')}
                            variant="contained"
                            onClick={() => setGenerated((value) => ++value)}
                        >
                            Generate
                        </Button>
                    </Stack>
                </LocalizationProvider>
            </Box>
        </Card>
    );

    const renderEmptyState = () => (
        <Card>
            <Stack alignItems="center" spacing={1} py={6}>
                <Typography variant="h5" color="text.secondary">
                    No report generated yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Select a report type{reportType === 'discounts' ? ' and member type' : ''}, then click Generate.
                </Typography>
            </Stack>
        </Card>
    );

    return (
        <Stack spacing={2.5}>
            {renderHeader()}
            {renderFilters()}
            {generated > 0 && reportType == 'sales' && <SalesReports {...params} generated={generated} onExport={handleExportRow} exportingKey={exportingKey} />}
            {generated > 0 && reportType == 'discounts' && <DiscountReports {...params} generated={generated} onExport={handleExportRow} exportingKey={exportingKey} />}
            {generated === 0 && renderEmptyState()}
        </Stack>
    );
}

export default Reports;
