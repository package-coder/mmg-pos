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
    Button,
    MenuItem
} from '@mui/material';
import { useQuery } from 'react-query';
import _, { omit, startCase } from 'lodash';
import MainCard from 'ui-component/cards/MainCard';
import sales_deposits from 'api/sales_deposits';
import { IoMdPrint } from 'react-icons/io';
import CreateDepositModal from './components/CreateDepositModal';
import moment from 'moment';
import { useAuth } from 'providers/AuthProvider';
import Currency from 'ui-component/Currency';
import Role from 'utils/Role';
import { useCallback, useEffect, useState } from 'react';
import BranchFilter, { DEFAULT_BRANCH_FILTER } from 'ui-component/filter/BranchFilter';
import DateFilter, { DateFilterEnum, DEFAULT_DATE_FILTER } from 'ui-component/filter/DateFilter';
import { CSVLink } from 'react-csv';
import generateReportFilename from '../../../utils/generateReportFilename';

function SalesDepositPage() {
    const { user, matchRole, branch, loading: fetchingUser } = useAuth();

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
            endDate: customDate?.endDate?.format('YYYY-MM-DD')
        },
        (value) => value != null
    );

    const { data: deposits, isLoading: fetchingSalesDeposits } = useQuery({
        queryKey: ['sales-deposits', dateFilter, customDate],
        queryFn: () => sales_deposits.GetAllSalesDeposit(params)
    });

    const today = moment().toISOString().split('T')[0];
    const hasExistingEntry = deposits?.some((deposit) => deposit.branch.id == branch?.id && deposit.dateDeposited == today);

    const [filteredDeposits, setFilteredDeposits] = useState(deposits);

    const fileName = generateReportFilename('sales-deposits', { branchFilter, dateFilter, customDate }) + '.csv';

    // useEffect(() => {
    //     let data = deposits || [];

    //     if (matchRole(Role.CASHIER) && user?.branches?.length > 1)
    //         data = deposits?.filter((deposit) => user?.branches?.some((branch) => branch.id == deposit.branch.id));

    //     if (matchRole(Role.CASHIER) && user?.branches?.length == 1) data = deposits?.filter((deposit) => deposit.branch.id == branch?.id);

    //     setFilteredDeposits(data);
    // }, [deposits, user]);

    const exportToCSV = useCallback(() => {
        const deposits = filteredDeposits;

        const header = Object.keys(deposits?.[0]).map((item) => startCase(item));
        const data = deposits.map((item) =>
            Object.values({
                ...item,
                branch: item.branch.name,
                cashier: startCase(item.cashier.name),
                createdAt: moment(item.createdAt).format()
            })
        );

        return [header, ...data];
    }, [filteredDeposits]);

    const renderView = (children) => (
        <MainCard title="Sales Deposits">
            <Stack mb={2} gap={1} direction="row" alignItems="center">
                <BranchFilter
                    filter={branchFilter}
                    onChange={(value) => setBranchFilter(value)}
                    values={deposits}
                    setValues={setFilteredDeposits}
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
                {!filteredDeposits || filteredDeposits?.length == 0 ? (
                    <Button variant="outlined" disabled>
                        Export CSV
                    </Button>
                ) : (
                    <CSVLink data={exportToCSV()} filename={fileName} style={{ textDecoration: 'none' }}>
                        <Button variant="outlined">Export CSV</Button>
                    </CSVLink>
                )}

                {!matchRole(Role.ADMIN) && <CreateDepositModal disabled={fetchingSalesDeposits || hasExistingEntry} />}
            </Stack>

            <Card sx={{ borderRadius: 2 }}>
                <TableContainer component={Paper}>
                    <Table sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow sx={{ '& .MuiTable-cell': { textWrap: 'nowrap' } }}>
                                {hasMultipleBranch && <TableCell>Branch</TableCell>}
                                <TableCell>Cashier</TableCell>
                                <TableCell>Total Deposited</TableCell>
                                <TableCell>Bank Name</TableCell>
                                <TableCell>Bank Address</TableCell>
                                <TableCell>Date Time</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!fetchingSalesDeposits &&
                                filteredDeposits?.map((deposit) => (
                                    <TableRow key={deposit.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        {hasMultipleBranch && <TableCell>{deposit.branch.name}</TableCell>}
                                        <TableCell>
                                            {deposit.cashier.first_name} {deposit.cashier.last_name}
                                        </TableCell>
                                        <TableCell>
                                            <Currency value={deposit.amount} />
                                        </TableCell>
                                        <TableCell>
                                            {deposit.bankName}{deposit.bankCode && <>({deposit.bankCode})</>}
                                        </TableCell>
                                        <TableCell>{deposit.bankAddress}</TableCell>
                                        <TableCell>{moment(deposit.createdAt).format('MM-DD-YY, hh:mm A')}</TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    {children}
                </TableContainer>
            </Card>
        </MainCard>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (fetchingSalesDeposits || fetchingUser) {
        return renderView(renderMessage(<CircularProgress size={28} />));
    }

    if (!filteredDeposits || filteredDeposits.length === 0) {
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

export default SalesDepositPage;
