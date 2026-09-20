import { Box, Button, Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import Receipt from "./ReceiptV2";
import { usePDF } from "react-to-pdf";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { dvoteDetails } from "utils/mockData";
import SplitButton from "ui-component/buttons/SplitButton";
import { useEffect } from "react";
import { IoMdPrint } from 'react-icons/io';
import { usePrinter } from 'providers/PrinterProvider';
import { useDevTestMode } from 'utils/devTestMode';
import { usePrinterTrialMode } from 'utils/printerTrialMode';
import { APP_ROLE } from 'api';


const ReceiptModal = ({ open, disableCloseAfterPrinting, reprint, onClose, onPrint, receipt, transaction, forceShow }) => {

    const { toPDF, targetRef } = usePDF({ filename: `invoice-${transaction?.invoiceNumber}.pdf`, page: { format: 'letter' } });
    const printing = usePrinter()?.printing
    // Dev Test Mode means every print is a throwaway test, not a real customer's/company's copy
    // pair — printing 2 physical copies for every test click just burns paper for nothing.
    const devTestMode = useDevTestMode()
    // Settings > Printer Settings > Paper Saver Mode — same single-print effect, independently
    // switchable for a real branch that just wants to save paper every day.
    const trialMode = usePrinterTrialMode()
    const singlePrintOnly = devTestMode || trialMode
    // Same restriction PrinterProvider/api/print.js enforce — disabled here too so the button
    // doesn't just fail with an error on the admin/cloud portal (no real printer attached there)
    // unless Dev Test Mode is on.
    const printDisabled = APP_ROLE === 'admin' && !devTestMode

    useEffect(() => {
        if (open) {
            console.warn('transaction', transaction)
        }
    }, [open])

    const handlePrint = async (index) => {
        try {
            await onPrint({
                ...receipt,
                reprint,
                transaction,
                dvoteDetails,
                companyCopy: index != 0
            })
            if (!disableCloseAfterPrinting) {
                onClose()
            }
        } catch {

        }
    }
    const handlePrint2 = async () => {
        try {
            // One request, not two: the helper journals the sale to ejournal.txt exactly once
            // per request (see pos-helper-app print_receipt's `copies` handling) and prints
            // `copies` physical copies within that same session — sending two separate requests
            // here used to journal the same sale twice, once per copy.
            await onPrint({
                ...receipt,
                reprint,
                transaction,
                dvoteDetails,
                copies: singlePrintOnly ? 1 : 2
            })
            if (!disableCloseAfterPrinting) {
                onClose()
            }
        } catch {

        }
    }
    const printLabel = reprint ? 'Reprint' : 'Print'

    return (
        <Dialog open={open} onClose={!forceShow ? onClose : null} maxWidth="sm" fullWidth>
            <DialogContent >
                <Box ref={targetRef} p={2} pr={1}>
                    <Receipt transaction={transaction} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                    <Button variant="outlined" color="primary" onClick={onClose}>
                        Back
                    </Button>
                    <Button startIcon={<DownloadIcon />} variant="contained" color="primary" onClick={() => toPDF({ resolution: 0.5 })}>
                        Download
                    </Button>
                    <Button
                        startIcon={<IoMdPrint />}
                        variant="contained"
                        color="primary"
                        onClick={handlePrint2}
                        disabled={printing || printDisabled}
                        title={printDisabled ? 'Printing is disabled on this admin/cloud instance. Turn on Dev Test Mode in Settings to enable it.' : undefined}
                    >
                        {printing ? 'Printing...' : 'Print'}
                    </Button>
                    {/* <SplitButton 
                        onClick={handlePrint} 
                        options={[`${printLabel} Customer\'s`, `${printLabel} Company\'s`]}
                    /> */}
                </Stack>
            </DialogActions>
        </Dialog>
    )
}

export default ReceiptModal