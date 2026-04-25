import React, {  } from 'react';
import { Typography, Card, Stack, Grid, Divider, Button, InputAdornment, TableContainer, Paper, Table, TableBody, TableHead, TableCell, IconButton, TableRow, CircularProgress, FormHelperText } from '@mui/material';
import TextField from 'ui-component/TextField';
import { FieldArray, Formik } from 'formik';
import { useMutation, useQuery } from 'react-query';
import branch_reports from 'api/branch_reports';
import { useAuth } from 'providers/AuthProvider';
import { FaPesoSign } from 'react-icons/fa6';
import AddIcon from '@mui/icons-material/Add';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CreateDepositModal, { CreateSalesDepositSchema } from '../components/CreateDepositModal';

const GenerateReportSchema = Yup.object().shape({
    branch: Yup.object().required(),
    endingCashBalance: Yup.string().required(),
    salesDeposits: Yup.array()
        .of(CreateSalesDepositSchema)
        .required()
        .min(1, 'Sales deposit must have atleast 1 item'),
});

const GenerateReportPage = () => {
    const { branch } = useAuth();
    const { data: sales, isLoading: fetchingGenerated } = useQuery('sales', () =>
        branch_reports.GetBranchSales({ branchId: branch?.id })
    );
    const { data: reports, isLoading: fetchingReports } = useQuery('branch-reports', () =>
        branch_reports.GetAllBranchReport({ branchId: branch.id, date: moment().toISOString().split('T')[0] })
    );

    const { mutateAsync: createBranchReport } = useMutation(branch_reports.CreateBranchReport);
    const navigate = useNavigate();

    const hasExistingReport = reports?.length > 0;

    if(fetchingReports)
        return <CircularProgress />

    if (hasExistingReport) 
        return <ReportMessage />;

    return (
        <Stack alignItems="center" sx={{ minHeight: '100dvh' }}>
            <Formik
                initialValues={{
                    branch,
                    endingCashBalance: '',
                    salesDeposits: []
                }}
                onSubmit={(values, actions) => {
                    createBranchReport({ ...values, branchId: values?.branch?.id })
                        .catch((e) => actions.setFieldError('submit', e))
                        .finally(() => navigate(-1));
                }}
                validationSchema={GenerateReportSchema}
            >
                {({ handleSubmit, submitForm, isSubmitting }) => (
                    <Card 
                        sx={{ 
                            px: 6, 
                            py: 4, 
                            maxWidth: 'md', 
                            display: 'flex', flexDirection: 'column', 
                            justifyContent: 'space-between' 
                        }}
                    >
                        <Button startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'start', mb: 2, bgcolor: 'grey.50' }} onClick={() => navigate(-1)} size="large">
                            Back
                        </Button>
                        <form noValidate onSubmit={handleSubmit}>
                            <Typography variant="h1" mb={6} fontSize={28} gutterBottom>
                                Generate Branch Report
                            </Typography>
                            <Grid container spacing={6} flexDirection='column'>
                                <Grid item xs md={12}>
                                    {
                                        (fetchingGenerated || fetchingReports) ? (
                                            <CircularProgress />
                                        ) : (
                                                <Grid container rowSpacing={0.8}>
                                                    {GridItem('Date: ', sales?.date)}
                                                    {GridItem('Invoice Number Series: ', '')}
                                                    {GridItem('Branch: ', branch.name)}
                                                    <Grid item xs={12}>
                                                        <Divider sx={{ my: 2 }} />
                                                    </Grid>
                                                    {GridItem('Total Beginning Cash: ', Currency(sales?.beginningCashOnHandTotal))}
                                                    {GridItem('Total Collection: ', Currency(sales?.endingCashOnHandTotal))}
                                                    {GridItem('Total Cash Sales: ', Currency(sales.totalNetSales))}
                                                    <Grid item xs={12}>
                                                        <Divider sx={{ my: 2 }} />
                                                    </Grid>
                                                    {GridItem('Total Cash Gain: ', Currency(sales?.totalCashGain))}
                                                    {GridItem('Total Cash Loss: ', Currency(sales?.totalCashLoss))}
                                                </Grid>
                                        )
                                    }

                                </Grid>

                                <Grid item xs md={12}>
                                    <SalesDepositList />
                                </Grid>
                            </Grid>
                        </form>
                        <Stack mt={12} direction='row' alignItems='center' justifyContent='end' spacing={2}>
                            <Typography  variant="h3" fontWeight="regular" color="grey.500">
                                Ending Cash Balance:
                            </Typography>
                            <TextField
                                autoFocus
                                size="large"
                                name="endingCashBalance"
                                disableFullWidth
                                inputProps={{
                                    autofocus: true,
                                    style: { textAlign: 'end', fontWeight: 'bold', paddingRight: '20px', fontSize: 16 }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Stack direction="row" alignItems="center">
                                                <FaPesoSign />
                                            </Stack>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Stack>
                        <Stack justifyContent="end" direction="row" mt={6} spacing={2}>
                            <Button 
                                disableElevation 
                                disabled={isSubmitting} 
                                onClick={submitForm} 
                                startIcon={<AddIcon />}
                                size="large" 
                                variant="contained"
                                sx={{ px: '1rem', py: '0.5rem' }}
                            >
                                {isSubmitting ? 'Loading...' : 'Generate Report'}
                                {/* Generate Report */}
                            </Button>
                        </Stack>
                    </Card>
                )}
            </Formik>
        </Stack>
    )
};

const GridItem = (label, value, highlight = false, indent = false) => (
    <>
        <Grid item xs={5}>
            <Typography sx={{ marginLeft: indent ? 4 : 0 }} variant="h3" fontWeight="regular" color="grey.500">
                {label}
            </Typography>
        </Grid>
        <Grid item xs={7} sx={{ textWrap: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Typography sx={highlight == true ? { color: 'primary.main' } : highlight} textAlign="end" variant="h3" textWrap="pretty">
                {value}
            </Typography>
        </Grid>
    </>
);

const Currency = (value) => (
    <>
        <FaPesoSign style={{ marginLeft: '6px', fontSize: '0.95rem' }} />
        {new Intl.NumberFormat().format(value?.toFixed(2))}
    </>
);


const SalesDepositList = () => {

    function getSum (values) {
        return values.reduce((prev, curr) => prev + Number(curr?.amount), 0)
    }

    return (
        <FieldArray 
            name='salesDeposits'
            render={({ form: { values: { salesDeposits }, errors }, push, handleRemove }) => (
                <Stack>
                    <Typography variant="h3" mb={2} >
                        Sales Deposit:
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table 
                            sx={{ 
                                tableLayout: 'fixed',
                                '& .MuiTableCell-root': {
                                    border: 1,
                                    borderColor: 'grey.200',
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Bank</TableCell>
                                    <TableCell>Account</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell sx={{ px: 1, width: { xs: '15%', md: '10%' }, textAlign: 'center'}}>
                                        <CreateDepositModal onSubmit={async value => await push(value)} />
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            
                            <TableBody>
                                {salesDeposits.length > 0 && salesDeposits.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.bankName}</TableCell>
                                        <TableCell>{item.bankAccount}</TableCell>
                                        <TableCell>{Currency(Number(item.amount))}</TableCell>
                                        <TableCell sx={{ p: 0, textAlign: 'center' }}>
                                            <IconButton onClick={handleRemove(index)} sx={{ bgcolor: 'white' }}>
                                                <CloseIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {salesDeposits.length > 0 && (
                        <Typography mr={2} color="lightgray" variant="h4" textAlign='end' mt={2}>
                            Total: {Currency(getSum(salesDeposits))}
                        </Typography>
                    )}
                    {salesDeposits.length == 0 && (
                        <Typography color="lightgray" variant="h5" mt={3} textAlign='center'>
                            No data available for this table.
                        </Typography>
                    )}
                    {errors?.salesDeposits && (
                        <FormHelperText error>
                            {errors?.salesDeposits}
                        </FormHelperText>
                    )}
                    
                </Stack>
            )}
        />
    )
}

const ReportMessage = () => {
    const navigate = useNavigate();
    return (
        <Stack alignItems="center" >
            <Card sx={{ p: 6, mb: 8, width: '100%', maxWidth: 'md' }}>
                <Typography variant="h1" fontSize={28} gutterBottom>
                    You have already created report
                </Typography>

                <Typography variant="h3" mb={3} color="gray" fontWeight="regular" gutterBottom>
                    Only one branch report is allowed per day.
                </Typography>
                <Button onClick={() => navigate(-1)} size="large" sx={{ bgcolor: 'grey.50' }}>
                    Go to Dashboard
                </Button>
            </Card>
        </Stack>
    );
};

export default GenerateReportPage;
