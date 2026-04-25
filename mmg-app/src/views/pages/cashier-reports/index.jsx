import {
    Stack,
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
    Box,
    Button
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { startCase, omit } from 'lodash';
import MainCard from 'ui-component/cards/MainCard';
import moment from 'moment';

import { useAuth } from 'providers/AuthProvider';
import Currency from 'ui-component/Currency';
import BranchFilter, { DEFAULT_BRANCH_FILTER } from 'ui-component/filter/BranchFilter';
import { useCallback, useState } from 'react';
import Role from 'utils/Role';
import DateFilter, { DateFilterEnum } from 'ui-component/filter/DateFilter';
import cashier_report from 'api/cashier_report';
import generateReportFilename from '../../../utils/generateReportFilename';
import { CSVLink } from 'react-csv';
import SummaryReportDialog from '../PosPage/components/XReportDialog';
import VisibilityIcon from '@mui/icons-material/Visibility';

function CashierReportsPage() {
    const { user, branch, loading: fetchingUser, matchRole } = useAuth();

    const [selected, setSelected] = useState(null);

    const hasOnlyOneBranch = user?.branches?.length == 1;
    const hasMultipleBranch = user?.branches?.length > 1;

    const [branchFilter, setBranchFilter] = useState(hasOnlyOneBranch ? branch?.name : DEFAULT_BRANCH_FILTER);
    const [dateFilter, setDateFilter] = useState(DateFilterEnum.THIS_MONTH);
    const [customDate, setCustomDate] = useState({});

    const params = _.pickBy(
        {
            dateFilter: dateFilter,
            customDate: customDate?.date?.format('YYYY-MM-DD'),
            startDate: customDate?.startDate?.format('YYYY-MM-DD'),
            endDate: customDate?.endDate?.format('YYYY-MM-DD'),
            cashierId: matchRole(Role.CASHIER) ? user?._id : null
        },
        (value) => value != null
    )

    const { data, isLoading: fetchingReports, isRefetching } = useQuery({
        queryKey: ['cashier-reports', dateFilter, customDate],
        queryFn: () => cashier_report.GetAllCashierReport(params)
    });
    const reports = data?.reports;
    const [filteredReports, setFilteredReports] = useState(reports);

    const fileName = generateReportFilename('cashier-reports', { branchFilter, dateFilter, customDate }) + '.csv';

    const clip = (value) => {
        if(!value)
            value = 0
        return value.toFixed(2)
    }

    const exportToCSV = useCallback(() => {
        const reports = filteredReports.map((item) => ({
            ...omit(item, ['invoiceNumberStr']),
            branch: item.branch.name,
            cashier: startCase(item.cashier.name),
            beginningCashOnHand: item.beginningCashOnHand?.total || 0,
            endingCashOnHand: item.endingCashOnHand?.total || 'N/A',
            // cashGain: item.endingCashOnHand?.total != 0 ? item.cashGain : 'N/A',
            // cashLoss: item.endingCashOnHand?.total != 0 ? item.cashLoss : 'N/A',
            timeIn: moment(item.timeIn, 'hh:mm:ss').format('hh:mm:ss A'),
            timeOut: item.timeOut ? moment(item.timeOut, 'hh:mm:ss').format('hh:mm:ss A') : 'N/A'
        }));

        const header = Object.keys(reports?.[0]).map((item) => startCase(item));
        const data = reports.map((item) => Object.values(item));

        return [header, ...data];
    }, [filteredReports]);

    const renderView = (children) => (
        <MainCard title="Cashier Reports">
            <Stack mb={2} gap={1} direction="row" alignItems='center' >
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
                {!filteredReports || filteredReports?.length == 0 || fetchingReports ? (
                    <Button variant="outlined" disabled>
                        Export CSV
                    </Button>
                ) : (
                    <CSVLink data={exportToCSV()} filename={fileName} style={{ textDecoration: 'none' }}>
                        <Button variant="outlined">Export CSV</Button>
                    </CSVLink>
                )}
            </Stack>

            <Card sx={{ borderRadius: 2 }}>
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Invoice Range #</TableCell>
                                <TableCell>Branch</TableCell>
                                {matchRole(Role.ADMIN) && <TableCell>Cashier</TableCell>}
                                <TableCell>Openning Fund</TableCell>
                                <TableCell>Ending Cash Count</TableCell>
                                <TableCell>Total Gross Sales</TableCell>
                                <TableCell>Total Member Discount</TableCell>
                                <TableCell>Total Net Sales</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Time In</TableCell>
                                <TableCell>Time Out</TableCell>
                                <TableCell sx={{ pl: 0, py: 0 }}>
                                    <Stack alignItems="end">
                                        <CircularProgress sx={{ visibility: isRefetching ? 'visible' : 'hidden' }} size={24} />
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!fetchingReports && filteredReports?.map((report) => (
                                <TableRow key={report._id}>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {report.sales?.invoiceStartNumber ? `${String(report.sales.invoiceStartNumber).padStart(6, '0')} - ${String(report.sales.invoiceEndNumber).padStart(6, '0')}` : '---'}
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
                                    <TableCell>{startCase(report.branch.name)}</TableCell>
                                    {matchRole(Role.ADMIN) && <TableCell>{report.cashier.name}</TableCell>}
                                    <TableCell>{clip(report?.openingFund?.total)}</TableCell>
                                    <TableCell>{clip(report?.endingCashCount?.total)}</TableCell>
                                    <TableCell>{clip(report.sales?.totalSalesWithoutMemberDiscount)}</TableCell>
                                    <TableCell>{clip(report.sales?.totalMemberDiscount)}</TableCell>
                                    <TableCell>{clip(report.sales?.totalNetSales)}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{moment(report.date).format("YYYY-MM-DD")}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>{moment(report.timeIn).format('h:mmA')}</TableCell>
                                    <TableCell sx={{ textWrap: 'nowrap' }}>
                                        {report.timeOut ? moment(report.timeOut).format('h:mmA') : '---'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            color="primary"
                                            onClick={() => setSelected(report)}
                                            startIcon={<VisibilityIcon />}
                                            // disabled={report.transactions.length == 0}
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
            <SummaryReportDialog disableActions open={selected != null} onClose={() => setSelected(null)} report={selected} />
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

export default CashierReportsPage;
