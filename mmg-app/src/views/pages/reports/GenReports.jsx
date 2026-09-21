import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    MenuItem,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Checkbox,
    ListItemText,
    Card,
    CircularProgress
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useForm, Controller } from 'react-hook-form';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQuery } from 'react-query';
import moment from 'moment';
import { CSVLink } from 'react-csv';

import Currency from 'ui-component/Currency';
import ReportPagination from 'ui-component/ReportPagination';

// api
import branch from 'api/branch';
import report from 'api/report';
// end

const REPORT_TYPES = [
    { value: 'comparativeData', label: 'Comparative Data' },
    { value: 'paymentType', label: 'Payment Type' },
    { value: 'typesOfClient', label: 'Types of Client' },
    { value: 'summaryIncome', label: 'Summary Income' },
    { value: 'packagesReports', label: 'Package Reports' },
    { value: 'salesJournal', label: 'Sales Journal' },
    { value: 'cashReceiptsJournal', label: 'Cash Receipts Journal' },
    { value: 'chargeJournal', label: 'Charge / Pay Later Journal' }
];

const ExampleTabs = () => {
    const [reportData, setReportData] = useState(null);
    const [typeOfReport, setTypeOfReport] = useState(null);
    const [queryParams, setQueryParams] = useState({ reportType: null, branch: [], startDate: null, endDate: null });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Fetch branch data once and cache it
    const { data: branches } = useQuery('branches', branch.GetAllBranch);

    const schema = Yup.object().shape({
        reportType: Yup.string().required('Report Type is required'),
        branch: Yup.array().of(Yup.string().required('Branch is required')).min(1, 'At least one branch must be selected'),
        startDate: Yup.date().required('Start Date is required'),
        endDate: Yup.date().required('End Date is required').min(Yup.ref('startDate'), 'End Date cannot be before Start Date')
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        reset
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            reportType: '',
            branch: [],
            startDate: null,
            endDate: null
        }
    });

    const watchReportType = watch('reportType');

    // Query to fetch reports
    const { isLoading, isRefetching } = useQuery(['reports', queryParams], () => report.GetReports(queryParams), {
        enabled: !!queryParams.reportType && queryParams.branch.length > 0 && !!queryParams.startDate && !!queryParams.endDate,
        onSuccess: (data) => {
            setReportData(data);
            setTypeOfReport(queryParams.reportType);
            setPage(0);
        }
    });

    const loading = isLoading || isRefetching;

    const handleGenerateReport = (data) => {
        const { reportType, branch: branchIds, startDate, endDate } = data;

        const formatDate = (date) => {
            const format = reportType === 'comparativeData' ? 'MM/YYYY' : 'MM/DD/YYYY';
            return moment(date).format(format);
        };

        setQueryParams({
            reportType,
            branch: branchIds,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        });
    };

    const handleReset = () => {
        reset({
            reportType: '',
            branch: [],
            startDate: null,
            endDate: null
        });
        setTypeOfReport(null);
        setReportData(null);
        setQueryParams({ reportType: null, branch: [], startDate: null, endDate: null });
    };

    const getDatePickerProps = (name) => ({
        name,
        control,
        render: ({ field }) => (
            <DatePicker
                {...field}
                label={`${name === 'startDate' ? 'Start' : 'End'} Date`}
                size="small"
                views={watchReportType === 'comparativeData' ? ['month', 'year'] : ['year', 'day']}
                format={watchReportType === 'comparativeData' ? 'MM YYYY' : 'ddd, DD MMM YYYY'}
                slotProps={{
                    textField: {
                        size: 'small',
                        error: !!errors[name],
                        helperText: errors[name] ? errors[name].message : '',
                        sx: { minWidth: 180 }
                    }
                }}
            />
        )
    });

    const reportTitle = REPORT_TYPES.find((option) => option.value === typeOfReport)?.label;
    const periodLabel = queryParams.startDate && queryParams.endDate ? `${queryParams.startDate} – ${queryParams.endDate}` : null;
    const branchLabel = useMemo(() => {
        if (!branches || !queryParams.branch?.length) return null;
        return queryParams.branch
            .map((id) => branches.find((b) => b.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    }, [branches, queryParams.branch]);

    const handlePrint = () => window.print();

    const csvData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        switch (typeOfReport) {
            case 'comparativeData': {
                const dateKeys = Object.keys(reportData).filter((key) => key !== 'diff');
                const uniqueCategories = Array.from(new Set(dateKeys.flatMap((date) => reportData[date].map((item) => item.name))));

                return uniqueCategories.map((categoryName) => ({
                    Details: categoryName,
                    'Last Year Count': reportData[dateKeys[0]]?.find((item) => item.name === categoryName)?.count || 0,
                    'Last Year Revenue': reportData[dateKeys[0]]?.find((item) => item.name === categoryName)?.revenue || 0,
                    'This Year Count': reportData[dateKeys[1]]?.find((item) => item.name === categoryName)?.count || 0,
                    'This Year Revenue': reportData[dateKeys[1]]?.find((item) => item.name === categoryName)?.revenue || 0,
                    '% Increase/Decrease': reportData.diff?.find((item) => item.name === categoryName)?.['% INCREASE/DECREASE'] || 'N/A'
                }));
            }
            case 'paymentType': {
                const uniqueCategoriesPType = new Set();
                reportData.forEach((b) => b.categories.forEach((category) => uniqueCategoriesPType.add(category.name)));
                const categoryNames = Array.from(uniqueCategoriesPType);
                const headerRow = [
                    'Type of Examination',
                    ...reportData
                        .map((b) => b.name)
                        .flatMap((branchName) => [`${branchName} Cash`, `${branchName} AR`, `${branchName} Total`])
                ];
                const dataRows = categoryNames.map((categoryName) => {
                    const row = [categoryName];
                    reportData.forEach((b) => {
                        const category = b.categories.find((cat) => cat.name === categoryName);
                        if (category) {
                            row.push(category.Cash, category.AR, category.Cash + category.AR);
                        } else {
                            row.push(0, 0, 0);
                        }
                    });
                    return row;
                });
                return [headerRow, ...dataRows];
            }
            case 'typesOfClient':
                return reportData.flatMap((location) =>
                    location.types.map((type) => ({
                        Location: location.name,
                        Name: type.name,
                        Amount: type.amount,
                        Count: type.count
                    }))
                );
            case 'summaryIncome': {
                const uniqueCategoriesSumIncome = new Set();
                reportData.forEach((b) => b.categories.forEach((category) => uniqueCategoriesSumIncome.add(category.name)));
                const categoryNamesSi = Array.from(uniqueCategoriesSumIncome);
                const headerRowSi = [
                    'Services',
                    ...reportData
                        .map((b) => b.name)
                        .flatMap((branchName) => [`${branchName} Cash`, `${branchName} Charge`, `${branchName} Total`])
                ];
                const dataRowsSi = categoryNamesSi.map((categoryName) => {
                    const row = [categoryName];
                    reportData.forEach((b) => {
                        const category = b.categories.find((cat) => cat.name === categoryName);
                        if (category) {
                            row.push(category.cash, category.charge, category.total);
                        } else {
                            row.push(0, 0, 0);
                        }
                    });
                    return row;
                });
                return [headerRowSi, ...dataRowsSi];
            }
            case 'packagesReports': {
                const uniquePackageNames = new Set();
                reportData.forEach((b) =>
                    Object.values(b.table).forEach((monthData) => monthData.packages.forEach((pkg) => uniquePackageNames.add(pkg.name)))
                );
                const packageNames = Array.from(uniquePackageNames);
                const branchNames = reportData.map((b) => b.name);
                const months = Array.from(new Set(reportData?.flatMap((b) => Object.keys(b.table))));
                const headerRowPr = ['Branch Name', 'Package Name', ...months.flatMap((month) => [`${month} Amount`, `${month} Count`])];
                const dataRowsPr = packageNames.flatMap((packageName) =>
                    branchNames.map((branchName) => {
                        const branchData = reportData.find((b) => b.name === branchName);
                        const row = [branchName, packageName];
                        months.forEach((month) => {
                            const packageData = branchData?.table[month]?.packages.find((pkg) => pkg.name === packageName);
                            row.push(packageData?.amount || 0, packageData?.count || 0);
                        });
                        return row;
                    })
                );
                return [headerRowPr, ...dataRowsPr];
            }
            case 'salesJournal':
            case 'cashReceiptsJournal':
            case 'chargeJournal':
                return reportData.map((b) => ({
                    'Ref No': b.refNo,
                    Customer: b.customer,
                    Address: b.address,
                    Date: moment(b.date).format('MM/DD/YYYY'),
                    'Gross Sales': b.grossSales,
                    Discount: b?.discount ? b?.discount?.toFixed(2) : 0.0,
                    'Net Sales': b.netSales,
                    'Discount Type': b.discountType ? b.discountType : 'none',
                    Payment: b.tenderType ? b.tenderType.toUpperCase() : '',
                    'Billed To': b.billTo || ''
                }));
            default:
                return [];
        }
    }, [reportData, typeOfReport]);

    const renderReport = () => {
        switch (typeOfReport) {
            case 'comparativeData': {
                const dateKeys = Object.keys(reportData).filter((key) => key !== 'diff');
                const uniqueCategories = Array.from(new Set(dateKeys.flatMap((date) => reportData[date].map((item) => item.name))));

                return (
                    <TableContainer>
                        <Table sx={{ minWidth: 800 }} aria-label="comparative data table">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        TYPE OF EXAMINATION
                                    </TableCell>
                                    {dateKeys.map((date) => (
                                        <TableCell
                                            align="center"
                                            colSpan={2}
                                            key={date}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                                        >
                                            {date}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        DIFFERENCE
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell />
                                    {dateKeys.map((date) => (
                                        <React.Fragment key={date}>
                                            <TableCell align="center">Count</TableCell>
                                            <TableCell align="center">Revenue</TableCell>
                                        </React.Fragment>
                                    ))}
                                    <TableCell align="center">% Increase/Decrease</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {uniqueCategories.map((categoryName) => (
                                    <TableRow key={categoryName} hover>
                                        <TableCell>{categoryName}</TableCell>
                                        {dateKeys.map((date) => {
                                            const category = reportData[date].find((item) => item.name === categoryName) || {};
                                            return (
                                                <React.Fragment key={date}>
                                                    <TableCell align="center">{(category.count || 0).toFixed(2)}</TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={category.revenue || 0} />
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                        <TableCell align="center">
                                            {reportData.diff.find((item) => item.name === categoryName)?.['% INCREASE/DECREASE'] || 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            }
            case 'paymentType':
                return (
                    <TableContainer>
                        <Table sx={{ minWidth: 800 }} aria-label="payment type table">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        TYPE OF EXAMINATION
                                    </TableCell>
                                    {reportData.map((b) => (
                                        <TableCell
                                            align="center"
                                            colSpan={3}
                                            key={b.name}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                                        >
                                            {b.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell />
                                    {reportData.map((b) => (
                                        <React.Fragment key={b.name}>
                                            <TableCell align="center">Cash</TableCell>
                                            <TableCell align="center">AR</TableCell>
                                            <TableCell align="center">Total</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((b) => b.categories.map((cat) => cat.name)))).map((categoryName) => (
                                    <TableRow key={categoryName} hover>
                                        <TableCell>{categoryName}</TableCell>
                                        {reportData.map((b) => {
                                            const category = b.categories.find((cat) => cat.name === categoryName) || {};
                                            return (
                                                <React.Fragment key={b.name}>
                                                    <TableCell align="center">
                                                        <Currency value={category.Cash || 0} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={category.AR || 0} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={(category.Cash || 0) + (category.AR || 0)} />
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'typesOfClient':
                return (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        TYPE OF MEMBERSHIP
                                    </TableCell>
                                    {reportData.map((b) => (
                                        <TableCell
                                            align="center"
                                            colSpan={2}
                                            key={b.name}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                                        >
                                            {b.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell />
                                    {reportData.map((b) => (
                                        <React.Fragment key={b.name}>
                                            <TableCell align="center">Count</TableCell>
                                            <TableCell align="center">Amount</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((b) => b.types.map((cat) => cat.name)))).map((categoryName) => (
                                    <TableRow key={categoryName} hover>
                                        <TableCell>{categoryName}</TableCell>
                                        {reportData.map((b) => {
                                            const category = b.types.find((cat) => cat.name === categoryName) || {};
                                            return (
                                                <React.Fragment key={b.name}>
                                                    <TableCell align="center">{(category.count || 0).toFixed(2)}</TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={category.amount || 0} />
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'summaryIncome':
                return (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>SERVICES</TableCell>
                                    {reportData.map((b) => (
                                        <TableCell
                                            align="center"
                                            colSpan={3}
                                            key={b.name}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                                        >
                                            {b.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell />
                                    {reportData.map((b) => (
                                        <React.Fragment key={b.name}>
                                            <TableCell align="center">Cash</TableCell>
                                            <TableCell align="center">Charge</TableCell>
                                            <TableCell align="center">Total</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((b) => b.categories.map((cat) => cat.name)))).map((categoryName) => (
                                    <TableRow key={categoryName} hover>
                                        <TableCell>{categoryName}</TableCell>
                                        {reportData.map((b) => {
                                            const category = b.categories.find((cat) => cat.name === categoryName) || {};
                                            return (
                                                <React.Fragment key={b.id || b.name}>
                                                    <TableCell align="center">
                                                        <Currency value={category.cash || 0} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={category.charge || 0} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Currency value={category.total || 0} />
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'packagesReports': {
                const months = Array.from(new Set(reportData?.flatMap((b) => Object.keys(b.table))));

                return (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        BRANCH NAME
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                        PACKAGE NAME
                                    </TableCell>
                                    {months.map((month) => (
                                        <TableCell
                                            align="center"
                                            colSpan={2}
                                            key={month}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                                        >
                                            {month}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell />
                                    <TableCell />
                                    {months.map((month) => (
                                        <React.Fragment key={month}>
                                            <TableCell align="center">Amount</TableCell>
                                            <TableCell align="center">Count</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData?.map((b) =>
                                    b?.table[months[0]].packages.map((pkg) => (
                                        <TableRow key={`${b.id}-${pkg.id}`} hover>
                                            <TableCell>{b.name}</TableCell>
                                            <TableCell>{pkg.name}</TableCell>
                                            {months.map((month) => {
                                                const packageData = b.table[month]?.packages.find((p) => p.id === pkg.id) || {};
                                                return (
                                                    <React.Fragment key={month}>
                                                        <TableCell align="center">
                                                            <Currency value={packageData.amount || 0} />
                                                        </TableCell>
                                                        <TableCell align="center">{(packageData.count || 0).toFixed(2)}</TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            }
            case 'salesJournal':
            case 'cashReceiptsJournal':
            case 'chargeJournal': {
                const paginated = reportData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                return (
                    <>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        {[
                                            'Ref No',
                                            'Customer',
                                            'Address',
                                            'Date',
                                            'Gross Sales',
                                            'Discount',
                                            'Net Sales',
                                            'Discount Type',
                                            'Payment',
                                            'Billed To'
                                        ].map((head) => (
                                            <TableCell key={head} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                                {head.toUpperCase()}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginated?.map((b) => (
                                        <TableRow key={b.id} hover>
                                            <TableCell>{b.refNo}</TableCell>
                                            <TableCell>{b.customer}</TableCell>
                                            <TableCell>{b.address}</TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>{moment(b.date).format('MM/DD/YYYY')}</TableCell>
                                            <TableCell>
                                                <Currency value={b.grossSales} />
                                            </TableCell>
                                            <TableCell>
                                                <Currency value={b?.discount || 0} />
                                            </TableCell>
                                            <TableCell>
                                                <Currency value={b.netSales} />
                                            </TableCell>
                                            <TableCell>{b.discountType ? b.discountType : 'none'}</TableCell>
                                            <TableCell sx={{ textWrap: 'nowrap' }}>{b.tenderType ? b.tenderType.toUpperCase() : '---'}</TableCell>
                                            <TableCell>{b.billTo || '---'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <ReportPagination
                            count={reportData.length}
                            page={page}
                            onPageChange={setPage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(value) => {
                                setRowsPerPage(value);
                                setPage(0);
                            }}
                            itemLabel="entries"
                        />
                    </>
                );
            }
            default:
                return null;
        }
    };

    const renderHeader = () => (
        <Card className="no-print">
            <Box sx={{ px: 3, py: 2.5 }}>
                <Typography variant="h2" fontWeight={600}>
                    General Reports
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Configure parameters to generate branch audits, financial reconciliations, and operational reports.
                </Typography>
            </Box>
        </Card>
    );

    const renderFilters = () => (
        <Card className="no-print">
            <Box sx={{ px: 3, py: 2.5 }}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                    <form onSubmit={handleSubmit(handleGenerateReport)}>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                            <Controller
                                name="reportType"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        size="small"
                                        label="Report Type"
                                        error={!!errors.reportType}
                                        helperText={errors.reportType?.message}
                                        sx={{ minWidth: 200 }}
                                    >
                                        {REPORT_TYPES.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            <Controller
                                name="branch"
                                control={control}
                                defaultValue={[]}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        size="small"
                                        label="Branch"
                                        error={!!errors.branch}
                                        helperText={errors.branch?.message}
                                        sx={{ minWidth: 200 }}
                                        SelectProps={{
                                            multiple: watchReportType !== 'comparativeData',
                                            renderValue: (selected) => {
                                                if (!branches) return '';
                                                if (Array.isArray(selected)) {
                                                    return selected
                                                        .map((value) => branches.find((b) => b.id === value)?.name)
                                                        .filter(Boolean)
                                                        .join(', ');
                                                }
                                                return branches.find((b) => b.id === selected)?.name || '';
                                            }
                                        }}
                                        onChange={(event) =>
                                            field.onChange(
                                                watchReportType !== 'comparativeData' ? event.target.value : [event.target.value]
                                            )
                                        }
                                    >
                                        {branches?.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>
                                                <Checkbox checked={field.value.includes(b.id)} />
                                                <ListItemText primary={b.name} />
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            <Controller {...getDatePickerProps('startDate')} />
                            <Controller {...getDatePickerProps('endDate')} minDate={watch('startDate')} />
                            <Box flex={1} />
                            <CSVLink
                                data={csvData}
                                filename={`${typeOfReport || 'report'}-${moment().format('YYYYMMDDHHmmss')}.csv`}
                                style={{ textDecoration: 'none' }}
                            >
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<DescriptionOutlinedIcon />}
                                    disabled={!csvData.length}
                                >
                                    Export CSV
                                </Button>
                            </CSVLink>
                            <Button variant="outlined" color="inherit" onClick={handleReset}>
                                Reset
                            </Button>
                            <Button variant="contained" type="submit">
                                Generate Report
                            </Button>
                        </Stack>
                    </form>
                </LocalizationProvider>
            </Box>
        </Card>
    );

    const renderEmptyState = () => (
        <Card className="no-print">
            <Stack alignItems="center" spacing={1} py={6}>
                <Typography variant="h5" color="text.secondary">
                    No report generated yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Select a report type, branch, and date range above, then click Generate Report.
                </Typography>
            </Stack>
        </Card>
    );

    const renderResult = () => (
        <Card sx={{ overflow: 'hidden' }}>
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <DescriptionOutlinedIcon color="action" />
                    <Box>
                        <Typography variant="h4" fontWeight={600}>
                            {reportTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {branchLabel ? `Branch: ${branchLabel}` : 'All branches'}
                            {periodLabel ? ` • Period: ${periodLabel}` : ''}
                        </Typography>
                    </Box>
                </Stack>
                <Button
                    className="no-print"
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<PrintOutlinedIcon />}
                    onClick={handlePrint}
                >
                    Print
                </Button>
            </Box>
            {loading ? (
                <Stack alignItems="center" py={6}>
                    <CircularProgress size={28} />
                </Stack>
            ) : reportData && (Array.isArray(reportData) ? reportData.length === 0 : Object.keys(reportData).length === 0) ? (
                <Stack alignItems="center" py={6}>
                    <Typography color="text.secondary" variant="h5">
                        No data available for this table
                    </Typography>
                </Stack>
            ) : (
                renderReport()
            )}
        </Card>
    );

    return (
        <Stack spacing={2.5}>
            <style>{'@media print { .no-print { display: none !important; } }'}</style>
            {renderHeader()}
            {renderFilters()}
            {typeOfReport && reportData ? renderResult() : renderEmptyState()}
        </Stack>
    );
};

export default ExampleTabs;
