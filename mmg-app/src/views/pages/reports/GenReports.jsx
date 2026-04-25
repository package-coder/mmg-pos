import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    Checkbox,
    ListItemText,
    Card,
    CardContent,
    CircularProgress // Import CircularProgress for loading spinner
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { useForm, Controller } from 'react-hook-form';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQuery } from 'react-query';
import moment from 'moment';
import { CSVLink } from 'react-csv';

// api
import branch from 'api/branch';
import report from 'api/report';
// end

const ExampleTabs = () => {
    const [reportData, setReportData] = useState(null);
    const [typeOfReport, setTypeOfReport] = useState(null);
    const [queryParams, setQueryParams] = useState({ reportType: null, branch: [], startDate: null, endDate: null });

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
        reset // Add reset function
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            // Define default values for all fields
            reportType: '',
            branch: [],
            startDate: null,
            endDate: null
        }
    });

    const watchReportType = watch('reportType');

    // Query to fetch reports
    const {
        refetch,
        isLoading,
    } = useQuery(['reports', queryParams], () => report.GetReports(queryParams), {
        enabled: !!queryParams.reportType && queryParams.branch.length > 0 && !!queryParams.startDate && !!queryParams.endDate, // Only fetch when all parameters are defined
        onSuccess: (data) => {
            setReportData(data);
            setTypeOfReport(queryParams.reportType);
        }
    });

    // dynamic generation of table
    // const columns = Object.keys(reportData[0]);
    // console.log('columns', columns);

    const handleGenerateReport = (data) => {
        const { reportType, branch, startDate, endDate } = data;

        // Format dates
        const formatDate = (date, reportType) => {
            const format = watchReportType === 'comparativeData' ? 'MM/YYYY' : 'MM/DD/YYYY';
            return moment(date).format(format);
        };


        console.log('formatDate', formatDate(startDate))

        // Set query parameters
        setQueryParams({
            reportType,
            branch,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        });

        // Refetch data
        refetch();
    };

    const handleReset = () => {
        reset({
            reportType: '',
            branch: [],
            startDate: null,
            endDate: null
        });
        setTypeOfReport(null);
    };

    const getDatePickerProps = (name) => ({
        name,
        control,
        render: ({ field }) => (
            <DatePicker
                {...field}
                label={`${name} Date`}
                size="small"
                views={watchReportType === 'comparativeData' ? ['month', 'year'] : ['year', 'day']}
                format={watchReportType === 'comparativeData' ? 'MM YYYY' : 'ddd, DD MMM YYYY'}
                slotProps={{
                    textField: {
                        fullWidth: true,
                        error: !!errors[name],
                        helperText: errors[name] ? errors[name].message : '',
                    },
                }}
            />
        ),
    });


    const csvData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        console.log('reportData', reportData);

        switch (typeOfReport) {
            case 'comparativeData':
                const dateKeys = Object.keys(reportData).filter((key) => key !== 'diff');
                const uniqueCategories = Array.from(new Set(dateKeys.flatMap((date) => reportData[date].map((item) => item.name))));

                return uniqueCategories.map((categoryName) => ({
                    Details: categoryName,
                    "Last Year Count": reportData[dateKeys[0]]?.find((item) => item.name === categoryName)?.count || 0,
                    "Last Year Revenue": reportData[dateKeys[0]]?.find((item) => item.name === categoryName)?.revenue || 0,
                    "This Year Count": reportData[dateKeys[1]]?.find((item) => item.name === categoryName)?.count || 0,
                    "This Year Revenue": reportData[dateKeys[1]]?.find((item) => item.name === categoryName)?.revenue || 0,
                    "% Increase/Decrease": reportData.diff?.find((item) => item.name === categoryName)?.['% INCREASE/DECREASE'] || 'N/A'
                }));
            case 'paymentType':
                // Create a set of unique category names across all branches
                const uniqueCategoriesPType = new Set();
                reportData.forEach((branch) => {
                    branch.categories.forEach((category) => uniqueCategoriesPType.add(category.name));
                });

                // Convert the set to an array for easier mapping
                const categoryNames = Array.from(uniqueCategoriesPType);

                // Create the header row for the CSV
                const headerRow = ['Type of Examination', ...reportData.map((branch) => branch.name).flatMap((branchName) => [`${branchName} Cash`, `${branchName} AR`, `${branchName} Total`])];

                // Create the data rows for the CSV
                const dataRows = categoryNames.map((categoryName) => {
                    const row = [categoryName];
                    reportData.forEach((branch) => {
                        const category = branch.categories.find((cat) => cat.name === categoryName);
                        if (category) {
                            row.push(category.Cash, category.AR, category.Cash + category.AR);
                        } else {
                            row.push(0, 0, 0); // If category doesn't exist for a branch, fill with zeros
                        }
                    });
                    return row;
                });

                // Combine header and data rows
                return [headerRow, ...dataRows];
            case 'typesOfClient':
                return reportData.flatMap((location) =>
                    location.types.map((type) => ({
                        Location: location.name,
                        Name: type.name,
                        Amount: type.amount,
                        Count: type.count
                    }))
                );
            case 'summaryIncome':
                // Create a set of unique category names across all branches
                const uniqueCategoriesSumIncome = new Set();
                reportData.forEach((branch) => {
                    branch.categories.forEach((category) => uniqueCategoriesSumIncome.add(category.name));
                });

                // Convert the set to an array for easier mapping
                const categoryNamesSi = Array.from(uniqueCategoriesSumIncome);

                // Create the header row for the CSV
                const headerRowSi = ['Services', ...reportData.map((branch) => branch.name).flatMap((branchName) => [`${branchName} Cash`, `${branchName} Charge`, `${branchName} Total`])];

                // Create the data rows for the CSV
                const dataRowsSi = categoryNamesSi.map((categoryName) => {
                    const row = [categoryName];
                    reportData.forEach((branch) => {
                        const category = branch.categories.find((cat) => cat.name === categoryName);
                        if (category) {
                            row.push(category.cash, category.charge, category.total);
                        } else {
                            row.push(0, 0, 0); // If category doesn't exist for a branch, fill with zeros
                        }
                    });
                    return row;
                });

                // Combine header and data rows
                return [headerRowSi, ...dataRowsSi];
            case 'packagesReports':
                // Extract unique package names across all branches and months
                const uniquePackageNames = new Set();
                reportData.forEach((branch) => {
                    Object.values(branch.table).forEach((monthData) => {
                        monthData.packages.forEach((pkg) => uniquePackageNames.add(pkg.name));
                    });
                });
                const packageNames = Array.from(uniquePackageNames);

                // Extract branches from the reportData
                const branches = reportData.map((branch) => branch.name);
                // Extract unique months across all branches
                const months = Array.from(new Set(reportData?.flatMap((branch) => Object.keys(branch.table))));

                // Create the header row for the CSV
                const headerRowPr = ['Branch Name', 'Package Name', ...months.flatMap((month) => [`${month} Amount`, `${month} Count`])];

                // Create the data rows for the CSV
                const dataRowsPr = packageNames.flatMap((packageName) => {
                    return branches.map((branchName) => {
                        const branchData = reportData.find((branch) => branch.name === branchName);
                        const row = [branchName, packageName];
                        months.forEach((month) => {
                            const packageData = branchData?.table[month]?.packages.find((pkg) => pkg.name === packageName);
                            row.push(packageData?.amount || 0, packageData?.count || 0);
                        });
                        return row;
                    });
                });

                // Combine header and data rows
                return [headerRowPr, ...dataRowsPr];
            case 'salesJournal':
                return reportData.map((branch) => ({
                    'Ref No': branch.refNo,
                    Customer: branch.customer,
                    Address: branch.address,
                    Date: moment(branch.date).format('MM/DD/YYYY'),
                    'Gross Sales': branch.grossSales,
                    Discount: branch?.discount ? branch?.discount?.toFixed(2) : 0.00,
                    'Net Sales': branch.netSales,
                    'Discount Type': branch.discountType ? branch.discountType : 'none'
                }));
            case 'cashReceiptsJournal':
                return reportData.map((branch) => ({
                    'Ref No': branch.refNo,
                    Customer: branch.customer,
                    Address: branch.address,
                    Date: moment(branch.date).format('MM/DD/YYYY'),
                    'Gross Sales': branch.grossSales,
                    Discount: branch?.discount ? branch?.discount?.toFixed(2) : 0.00,
                    'Net Sales': branch.netSales,
                    'Discount Type': branch.discountType ? branch.discountType : 'none'
                }));
            default:
                return [];
        }
    }, [reportData, typeOfReport]);

    const renderReport = () => {
        switch (typeOfReport) {
            case 'comparativeData':
                const dateKeys = Object.keys(reportData).filter((key) => key !== 'diff');
                const uniqueCategories = Array.from(new Set(dateKeys.flatMap((date) => reportData[date].map((item) => item.name))));

                return (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 800 }} aria-label="payment type table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type of Examination</TableCell>
                                    {dateKeys.map((date) => (
                                        <TableCell align="center" colSpan={2} key={date}>
                                            {date}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">Difference</TableCell>
                                </TableRow>
                                <TableRow>
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
                                    <TableRow key={categoryName}>
                                        <TableCell>{categoryName}</TableCell>
                                        {dateKeys.map((date) => {
                                            const category = reportData[date].find((item) => item.name === categoryName) || {};
                                            return (
                                                <React.Fragment key={date}>
                                                    <TableCell align="center">{(category.count || 0).toFixed(2)}</TableCell>
                                                    <TableCell align="center">{(category.revenue || 0).toFixed(2)}</TableCell>
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
            case 'paymentType':
                return (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 800 }} aria-label="payment type table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type of Examination</TableCell>
                                    {reportData.map((branch) => (
                                        <TableCell align="center" colSpan={3} key={branch.name}>
                                            {branch.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow>
                                    <TableCell />
                                    {reportData.map((branch) => (
                                        <React.Fragment key={branch.name}>
                                            <TableCell align="center">Cash</TableCell>
                                            <TableCell align="center">AR</TableCell>
                                            <TableCell align="center">Total</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((branch) => branch.categories.map((cat) => cat.name)))).map(
                                    (categoryName) => (
                                        <TableRow key={categoryName}>
                                            <TableCell>{categoryName}</TableCell>
                                            {reportData.map((branch) => {
                                                const category = branch.categories.find((cat) => cat.name === categoryName) || {};
                                                return (
                                                    <React.Fragment key={branch.name}>
                                                        <TableCell align="center">{(category.Cash || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="center">{(category.AR || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="center">{((category.Cash + category.AR )|| 0).toFixed(2)}</TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'typesOfClient':
                return (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type of Membership</TableCell>
                                    {reportData.map((branch) => (
                                        <TableCell align="center" colSpan={2} key={branch.name}>
                                            {branch.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow>
                                    <TableCell />
                                    {reportData.map((branch) => (
                                        <React.Fragment key={branch.name}>
                                            <TableCell align="center">Count</TableCell>
                                            <TableCell align="center">Amount</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((branch) => branch.types.map((cat) => cat.name)))).map(
                                    (categoryName) => (
                                        <TableRow key={categoryName}>
                                            <TableCell>{categoryName}</TableCell>
                                            {reportData.map((branch) => {
                                                const category = branch.types.find((cat) => cat.name === categoryName) || {};
                                                return (
                                                    <React.Fragment key={branch.name}>
                                                        <TableCell align="center">{(category.count || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="center">{(category.amount || 0).toFixed(2)}</TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'summaryIncome':
                return (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Services</TableCell>
                                    {reportData.map((branch) => (
                                        <TableCell align="center" colSpan={3} key={branch.name}>
                                            {branch.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow>
                                    <TableCell />
                                    {reportData.map((branch) => (
                                        <React.Fragment key={branch.name}>
                                            <TableCell align="center">Cash</TableCell>
                                            <TableCell align="center">Charge</TableCell>
                                            <TableCell align="center">Total</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from(new Set(reportData.flatMap((branch) => branch.categories.map((cat) => cat.name)))).map(
                                    (categoryName) => (
                                        <TableRow key={categoryName}>
                                            <TableCell>{categoryName}</TableCell>
                                            {reportData.map((branch) => {
                                                const category = branch.categories.find((cat) => cat.name === categoryName) || {};
                                                return (
                                                    <React.Fragment key={branch.id}>
                                                        <TableCell align="center">{(category.cash || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="center">{(category.charge || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="center">{(category.total || 0).toFixed(2)}</TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'packagesReports':
                // Extract branches from the reportData
                const branches = reportData.map((branch) => branch.name);
                // Extract unique months across all branches
                const months = Array.from(new Set(reportData?.flatMap((branch) => Object.keys(branch.table))));

                console.log('reportData', reportData);
                console.log('branches', months);

                return (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Branch Name</TableCell>
                                    <TableCell>Package Name</TableCell>
                                    {months.map((month) => (
                                        <React.Fragment key={month}>
                                            <TableCell align="center" colSpan={2}>
                                                {month}
                                            </TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                                <TableRow>
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
                                {/* Iterate over each branch */}
                                {reportData?.map((branch) =>
                                    branch?.table[months[0]].packages.map((pkg) => (
                                        <TableRow key={`${branch.id}-${pkg.id}`}>
                                            <TableCell>{branch.name}</TableCell>
                                            <TableCell>{pkg.name}</TableCell>
                                            {months.map((month) => {
                                                const packageData = branch.table[month]?.packages.find((p) => p.id === pkg.id) || {};
                                                return (
                                                    <React.Fragment key={month}>
                                                        <TableCell align="center">{(packageData.amount || 0).toFixed(2)}</TableCell>
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
            case 'salesJournal':
                return (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ref No</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Address</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Gross Sales</TableCell>
                                    <TableCell>Discount</TableCell>
                                    <TableCell>Net Sales</TableCell>
                                    <TableCell>Discount Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData?.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell>{branch.refNo}</TableCell>
                                        <TableCell>{branch.customer}</TableCell>
                                        <TableCell>{branch.address}</TableCell>
                                        <TableCell>{moment(branch.date).format('MM/DD/YYYY')}</TableCell>
                                        <TableCell>{branch.grossSales}</TableCell>
                                        <TableCell>{branch?.discount ? branch?.discount?.toFixed(2) : 0.00}</TableCell>
                                        <TableCell>{branch.netSales}</TableCell>
                                        <TableCell>{branch.discountType ? branch.discountType : 'none'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case 'cashReceiptsJournal':
                return (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ref No</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Address</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Gross Sales</TableCell>
                                    <TableCell>Discount</TableCell>
                                    <TableCell>Net Sales</TableCell>
                                    <TableCell>Discount Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData?.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell>{branch.refNo}</TableCell>
                                        <TableCell>{branch.customer}</TableCell>
                                        <TableCell>{branch.address}</TableCell>
                                        <TableCell>{moment(branch.date).format('MM/DD/YYYY')}</TableCell>
                                        <TableCell>{branch.grossSales}</TableCell>
                                        <TableCell>{branch?.discount ? branch?.discount?.toFixed(2) : 0.00}</TableCell>
                                        <TableCell>{branch.netSales}</TableCell>
                                        <TableCell>{branch.discountType ? branch.discountType : 'none'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            default:
                return null;
        }
    };

    return (
        <MainCard title="General Reports">
            <Card>
                <CardContent>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <form onSubmit={handleSubmit(handleGenerateReport)}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={2}>
                                    <Controller
                                        name="reportType"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth error={!!errors.reportType}>
                                                <InputLabel id="report-type-label">Report Type</InputLabel>
                                                <Select labelId="report-type-label" {...field} label="Report Type">
                                                    <MenuItem value="comparativeData">Comparative Data</MenuItem>
                                                    <MenuItem value="paymentType">Payment Type</MenuItem>
                                                    <MenuItem value="typesOfClient">Types of Client</MenuItem>
                                                    <MenuItem value="summaryIncome">Summary Income</MenuItem>
                                                    <MenuItem value="packagesReports">Package Reports</MenuItem>
                                                    <MenuItem value="salesJournal">Sales Journal</MenuItem>
                                                    <MenuItem value="cashReceiptsJournal">Cash Receipts Journal</MenuItem>
                                                </Select>
                                                {errors.reportType && <Typography color="error">{errors.reportType.message}</Typography>}
                                            </FormControl>
                                        )}
                                    />
                                    <Controller
                                        name="branch"
                                        control={control}
                                        defaultValue={[]} // Ensure default value is an array
                                        render={({ field }) => (
                                            <FormControl fullWidth error={!!errors.branch}>
                                                <InputLabel id="branch-label">Branch</InputLabel>
                                                <Select
                                                    labelId="branch-label"
                                                    {...field}
                                                    label="Branch"
                                                    multiple={watchReportType !== 'comparativeData'} // Disable multiple selection for comparativeData
                                                    renderValue={(selected) => {
                                                        if (branches) {
                                                            // Check if selected is an array before using map
                                                            if (Array.isArray(selected)) {
                                                                return selected
                                                                    .map((value) => {
                                                                        const branch = branches.find((b) => b.id === value);
                                                                        return branch ? branch.name : '';
                                                                    })
                                                                    .join(', ');
                                                            } else {
                                                                // If selected is not an array, find the branch directly
                                                                const branch = branches.find((b) => b.id === selected);
                                                                return branch ? branch.name : '';
                                                            }
                                                        }
                                                        return '';
                                                    }}
                                                    onChange={(event) => {
                                                        // Update the field value with selected items
                                                        // If multiple is false, only update with a single value
                                                        field.onChange(watchReportType !== 'comparativeData' ? event.target.value : [event.target.value]);
                                                    }}
                                                >
                                                    {branches?.map((branch) => (
                                                        <MenuItem key={branch.id} value={branch.id}>
                                                            <Checkbox checked={field.value.includes(branch.id)} />
                                                            <ListItemText primary={branch.name} />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {errors.branch && <Typography color="error">{errors.branch.message}</Typography>}
                                            </FormControl>
                                        )}
                                    />

                                    <Controller {...getDatePickerProps('startDate')} />
                                    <Controller {...getDatePickerProps('endDate')} minDate={watch('startDate')} />
                                </Stack>
                                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                                    <CSVLink
                                        data={csvData}
                                        filename={`${typeOfReport || 'report'}-${moment().format('YYYYMMDDHHmmss')}.csv`}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Button variant="outlined" disabled={!csvData.length}>
                                            Export CSV
                                        </Button>
                                    </CSVLink>
                                    <Button variant="outlined" onClick={handleReset}>
                                        Reset
                                    </Button>
                                    <Button variant="contained" type="submit">
                                        Generate Report
                                    </Button>
                                </Stack>
                            </Stack>
                        </form>
                    </LocalizationProvider>
                </CardContent>
            </Card>
            <Box sx={{ mt: 3 }}>
                {isLoading ? (
                    <Stack alignItems="center" my={4}>
                        <CircularProgress />
                    </Stack>
                ) : (
                    renderReport() // Render the report
                )}
            </Box>
        </MainCard>
    );
};

export default ExampleTabs;
