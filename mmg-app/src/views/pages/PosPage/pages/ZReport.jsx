import { Stack, Card, Typography, Button, Box } from '@mui/material';
import { CashierReportWrapper, useCashierReport } from 'providers/CashierReportProvider';
import { useNavigate } from 'react-router-dom';
import PageLoader from 'ui-component/PageLoader';
import XReading from 'views/pages/cashier-reports/components/XReadingReport';
import { IoMdPrint } from 'react-icons/io';
import print from 'api/print';
import { useMutation, useQuery } from 'react-query';
import { dvoteDetails } from 'utils/mockData';
import cashier_report from 'api/cashier_report';
import moment from 'moment';
import { useAuth } from 'providers/AuthProvider';
import branch_reports from 'api/branch_reports';
import ZReadingReport from 'views/pages/cashier-reports/components/ZReadingReport';
import { usePrinter } from 'providers/PrinterProvider';

export default function () {
    const navigate = useNavigate();
    const { branch } = useAuth()
    const { print: printToDevice } = usePrinter()

    const { data, isLoading: loading } = useQuery({
        queryKey: ['today-branch-report', branch],
        queryFn: () => branch_reports.GetAllBranchReport({
            date:  moment().format('YYYY-MM-DD'),
            branchIds: branch.id,
        }),
        enabled: !!branch
    })
    const report = data?.[0]
    const { mutateAsync: printAsync } = useMutation(print.PrintReport)

    async function onPrint() {
        await printAsync({ ...report, dvoteDetails, type: 'Z_REPORT' })
    }

    async function onPrintEjournal() {
        try {
            printToDevice('printer', 'ejournal', {})
        } catch (error) {
            console.error('Error printing electronic journal:', error)
        }
    }

    if (loading) return <PageLoader />;

    if(!report) {
        return (
            <Stack p={6} py={8} bgcolor="primary.light" alignItems="center" sx={{ p: 5, minHeight: '100dvh' }}>
                <Stack maxWidth="sm" width='100%'>
                    <Card sx={{ px: 5, py: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h3" gutterBottom>
                               No sales has been made to generate Z-Reading Report.
                            </Typography>
                        </Stack>
                        <Stack ml={-1} mt={1} direction="row" alignItems="center" justifyContent='space-between' spacing={2}>
                            <Button color="primary" size="large" onClick={() => navigate('/dashboard/cashier-reports')}>
                                Go to dashboard
                            </Button>
                        </Stack>
                    </Card>
                </Stack>
            </Stack>
        )
    }

    return (
        <Stack p={6} py={8} bgcolor="primary.light" alignItems="center" justifyContent="center" sx={{ p: 5, minHeight: '100dvh' }}>
            <Stack maxWidth="sm" width='100%'>
                <Typography variant="h2" mb={4} gutterBottom>
                    Your session for this day has ended.
                </Typography>

                <Card sx={{ px: 5, py: 4 }}>
                    <Stack direction="row" mb={3} justifyContent="space-between" alignItems="center">
                        <Typography variant="h4" gutterBottom>
                            Z-Reading Report
                        </Typography>
                        <Button onClick={onPrint} startIcon={<IoMdPrint />} sx={{ bgcolor: 'grey.50' }} color="primary">
                            Print 
                        </Button>
                    </Stack>
                    
                    <ZReadingReport report={report} />
                    <Stack mt={5} direction="column" spacing={2}>
                        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <Typography variant="body2" color="textSecondary" mb={1}>
                                Audit & Maintenance
                            </Typography>
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={onPrintEjournal}
                                fullWidth
                                size="small"
                            >
                                Print Electronic Journal
                            </Button>
                        </Box>
                        <Stack direction="row" alignItems="center" justifyContent="end" spacing={2}>
                            <Button color="primary" size="large" onClick={() => navigate('/dashboard/cashier-reports')}>
                                Go to dashboard
                            </Button>
                        </Stack>
                    </Stack>
                </Card>
            </Stack>
        </Stack>
    );
};
