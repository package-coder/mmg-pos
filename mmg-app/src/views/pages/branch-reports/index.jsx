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
    Container,
    Card,
    CircularProgress,
    Box,
    Button
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { omit, pick, startCase } from 'lodash';
import MainCard from 'ui-component/cards/MainCard';
import { IoMdPrint } from 'react-icons/io';
import moment from 'moment';
import branch_reports from 'api/branch_reports';

import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'providers/AuthProvider';
import Currency from 'ui-component/Currency';
import BranchFilter, { DEFAULT_BRANCH_FILTER } from 'ui-component/filter/BranchFilter';
import { useEffect, useState } from 'react';
import Role from 'utils/Role';
import DateFilter, { DateFilterEnum, DEFAULT_DATE_FILTER } from 'ui-component/filter/DateFilter';
import { CSVLink } from 'react-csv';
import generateReportFilename from '../../../utils/generateReportFilename';
import { useCallback } from 'react';
import { CashierReportWrapper, useCashierReport } from 'providers/CashierReportProvider';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ZReportDialog from '../PosPage/components/ZReportDialog';


function BranchReportsPage() {
    const navigate = useNavigate();
    const { user, branch, loading: fetchingUser, matchRole } = useAuth();

    const [selected, setSelected] = useState(null);

    const hasOnlyOneBranch = user?.branches?.length == 1;
    const hasMultipleBranch = user?.branches?.length > 1;

    const [branchFilter, setBranchFilter] = useState(hasOnlyOneBranch ? branch?.name : DEFAULT_BRANCH_FILTER);
    const [dateFilter, setDateFilter] = useState(DateFilterEnum.THIS_MONTH);
    const [customDate, setCustomDate] = useState({});

    const { hasNoReportToday } = useCashierReport()

    const params = _.pickBy(
        {
            dateFilter: dateFilter,
            customDate: customDate?.date?.format('YYYY-MM-DD'),
            startDate: customDate?.startDate?.format('YYYY-MM-DD'),
            endDate: customDate?.endDate?.format('YYYY-MM-DD'),
            branchIds: user?.branches?.map(branch => branch.id).join(',')
        },
        (value) => value != null
    );

    const { data, isLoading: fetchingReports, isRefetching } = useQuery({
        queryKey: ['branch-reports', dateFilter, customDate, user], 
        queryFn: () => branch_reports.GetAllBranchReport(params),
        enabled: !fetchingUser && user != null
    })
    const reports = data || []
    
    const [filteredReports, setFilteredReports] = useState(reports)

    const today = moment().toISOString().split('T')[0];
    const hasExistingEntry = reports?.some((report) => report.branch.id == branch?.id && report.date == today);

    useEffect(() => {
        let data = reports || [];

        // if (matchRole(Role.CASHIER) && user?.branches?.length > 1)
        //     data = reports?.filter((deposit) => user?.branches?.some((branch) => branch.id == deposit.branch.id));

        // if (matchRole(Role.CASHIER) && user?.branches?.length == 1) 
        //     data = reports?.filter((deposit) => deposit.branch.id == branch?.id);

        setFilteredReports(data);
    }, [reports, user]);

    const fileName = generateReportFilename('branch-reports', { branchFilter, dateFilter, customDate }) + '.csv';

    const exportToCSV = useCallback(() => {
        const reports = filteredReports;

        const header = Object.keys(reports?.[0]).map((item) => startCase(item));
        const data = reports.map((item) =>
            Object.values({
                ...omit(item, 'salesDeposits'),
                branch: item.branch.name,
                cashier: startCase(item.cashier?.name),
                // ...pick(item.salesDeposit, ['bankName', 'bankCode', 'bankAddress', 'dateDeposited']),
                // totalDeposited: item.salesDeposit.amount,
                // endingCashBalance: item.salesDeposit.balance,
                // dateDeposited: moment(item.salesDeposit.createdAt).format(),
                // depositor: item.cashier.name,
                createdAt: moment(item.createdAt).format()
            })
        );
        const otherHeader = [
            // 'BankName',
            // 'BankCode',
            // 'BankAddress',
            // 'DateDeposited',
            // 'TotalDeposited',
            // 'EndingCashBalance',
            // 'DateDeposited',
            // 'Depositor'
        ];
        return [[...header, ...otherHeader], ...data];
    }, [filteredReports]);

    const clip = (value) => {
        if(!value)
            value = 0
        return value.toFixed(2)
    }

    const renderView = (children) => (
        <MainCard title="Branch Reports">
            <Stack mb={2} gap={1} direction="row" alignItems="center">
                <BranchFilter
                    filter={branchFilter}
                    onChange={(value) => setBranchFilter(value)}
                    values={reports}
                    setValues={setFilteredReports}
                    {...(matchRole(Role.CASHIER)
                        ? {
                              options: user?.branches?.map((branch) => branch.name),
                              disabled: hasOnlyOneBranch
                          }
                        : {})}
                />
                <DateFilter
                    filter={dateFilter}
                    onChange={(value) => setDateFilter(value)}
                    customDate={customDate}
                    onChangeCustomDate={setCustomDate}
                />
                <Box flex={1}></Box>
                {!filteredReports || filteredReports?.length == 0 ? (
                    <Button variant="outlined" disabled>
                        Export CSV
                    </Button>
                ) : (
                    <CSVLink data={exportToCSV()} filename={fileName} style={{ textDecoration: 'none' }}>
                        <Button variant="outlined">Export CSV</Button>
                    </CSVLink>
                )}
                {/* {!matchRole(Role.ADMIN) && (
                    <Button
                        disabled={fetchingReports || hasExistingEntry || hasNoReportToday}
                        onClick={() => navigate('/pos/z-report')}
                        startIcon={<AddIcon />}
                        variant="contained"
                        color="primary"
                    >
                        Generate Report
                    </Button>
                )} */}
            </Stack>

            <Card sx={{ borderRadius: 2 }}>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& .MuiTable-cell': { textWrap: 'nowrap' } }}>
                                <TableCell>Invoice Range #</TableCell>
                                {hasMultipleBranch && <TableCell>Branch</TableCell>}
                                <TableCell>Total Openning Fund</TableCell>
                                <TableCell>Total Ending Cash Count</TableCell>
                                <TableCell>Total Gross Sales</TableCell>
                                <TableCell>Total Member Discount</TableCell>
                                <TableCell>Total Net Sales</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell sx={{ pl: 0, py: 0 }}>
                                    <Stack alignItems="end">
                                        <CircularProgress sx={{ visibility: isRefetching ? 'visible' : 'hidden' }} size={24} />
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!fetchingReports &&
                                filteredReports?.map((report) => (
                                    <TableRow key={report._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {report.invoiceStartNumber ? `${String(report.invoiceStartNumber).padStart(6, '0')} - ${String(report.invoiceEndNumber).padStart(6, '0')}` : '---'}
                                            {/* {report.sales.invoiceStartNumber ? (
                                                <>
                                                    {report.invoiceNumberStr} 
                                                    <br/>({report.sales.invoiceStartNumber}  
                                                    {report.sales.invoiceEndNumber && (
                                                        <> - {report.sales.invoiceEndNumber}</>
                                                    )}
                                                    ) 
                                                </>
                                            ) : '---'} */}
                                        </TableCell>
                                        {hasMultipleBranch && <TableCell>{report.branch.name}</TableCell>}
                                        <TableCell>{clip(report.openingFund?.total || 0)}</TableCell>
                                        <TableCell>{clip(report.endingCashCount?.total || 0)}</TableCell>
                                        <TableCell>{clip(report.totalSalesWithoutMemberDiscount)}</TableCell>
                                        <TableCell>{clip(report.totalMemberDiscount)}</TableCell>
                                        <TableCell>{clip(report.totalNetSales)}</TableCell>
                                        <TableCell>{moment(report.date).format('YYYY-MM-DD')}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="primary"
                                                onClick={() => setSelected(report)}
                                                startIcon={<VisibilityIcon />}
                                                disabled={report.transactions.length == 0}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    {children}
                </TableContainer>
            </Card>
            <ZReportDialog open={selected != null} onClose={() => setSelected(null)} report={selected}  />
        </MainCard>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (fetchingReports || fetchingUser) {
        return renderView(renderMessage(<CircularProgress size={28} />));
    }

    if (!filteredReports || filteredReports.length === 0) {
        return renderView(
            renderMessage(
                <Typography color="lightgray" variant="h5">
                    No data available for this table. Try changing your search filters
                </Typography>
            )
        );
    }

    return renderView();
}

export default CashierReportWrapper(BranchReportsPage);
