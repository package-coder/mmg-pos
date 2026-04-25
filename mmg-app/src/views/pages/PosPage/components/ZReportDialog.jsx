import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IoMdPrint } from 'react-icons/io';
import { Margin, Resolution, usePDF } from 'react-to-pdf';
import ZReadingReport from 'views/pages/cashier-reports/components/ZReadingReport';
import DownloadIcon from '@mui/icons-material/Download';
import { dvoteDetails } from 'utils/mockData';
import { useMutation } from 'react-query';
import print from 'api/print';
import moment from 'moment';


export default ({ open, report, onClose }) => {
    const navigate = useNavigate();
    const { mutateAsync: printAsync } = useMutation(print.PrintReport)
    const { toPDF, targetRef } = usePDF({filename: 'z-report.pdf'});
        
    if (!open) return null;

    const reprint = moment().format('YYYY-MM-DD') != report?.date


    return (
        <Dialog  onClose={onClose} maxWidth="xs" fullWidth open={open} >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4">Z Reading Report</Typography>
                <Box flex={1}></Box>
                <Button 
                    startIcon={<IoMdPrint />} 
                    sx={{ bgcolor: 'grey.50', mr: 1 }} 
                    color="primary" 
                    onClick={async () => await printAsync({ ...report, reprint, dvoteDetails, 'type': 'Z_REPORT' })}
                >
                    Print
                </Button>
                <Button 
                    startIcon={<DownloadIcon />} 
                    sx={{ bgcolor: 'grey.50' }} 
                    color="primary" 
                    onClick={() => 
                        toPDF({ resolution: Resolution.EXTREME, page: { margin: Margin.LARGE } })}
                >
                    Download
                </Button>
            </DialogTitle>
            <DialogContent ref={targetRef}>
                <Stack mb={3} alignItems='center'>
                </Stack>
                <ZReadingReport reprint={reprint} report={report}/>
            </DialogContent>
            {/* {disableActions != true && (
                <DialogActions>
                    <Button color="primary" onClick={() => navigate('/dashboard/cashier-reports')}>
                        Go to dashboard
                    </Button>
                    <Button color="primary" onClick={() => navigate('/dashboard/branch-reports/new')}>
                        Generate Report
                    </Button>
                </DialogActions>
            )} */}
        </Dialog>
    );
};
