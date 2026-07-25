import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, FormControlLabel, Switch } from '@mui/material';
import axios from 'axios';
import PrinterProvider, { PrinterWrapper, usePrinter } from 'providers/PrinterProvider';

const PrinterSettings = () => {
    const [printerIP, setPrinterIP] = useState('');
    const [printerPort, setPrinterPort] = useState('');
    const [testMessage, setTestMessage] = useState('Test print message');
    const [statusMessage, setStatusMessage] = useState('');
    const [trialMode, setTrialMode] = useState(false);
    const { print, status } = usePrinter()

    useEffect(() => {
        const savedPrinterIP = localStorage.getItem('printerIP');
        const savedPrinterPort = localStorage.getItem('printerPort');
        const savedTrialMode = localStorage.getItem('printerTrialMode');

        if (savedPrinterIP) {
            setPrinterIP(savedPrinterIP);
        }
        if (savedPrinterPort) {
            setPrinterPort(savedPrinterPort);
        }
        if (savedTrialMode !== null) {
            setTrialMode(JSON.parse(savedTrialMode));
        }
    }, []);

    const handlePrintTest = () => {
        print('printer', 'test', { settings: 'network', message: testMessage })
        // try {
        //     const response = await axios.post(`http://localhost:3001/print`, {
        //         message: testMessage
        //     });
        //     setStatusMessage(response.data.status);
        // } catch (error) {
        //     setStatusMessage('Error printing: ' + error.message);
        // }
    };

    const handlePrinterIPChange = (e) => {
        const ip = e.target.value;
        setPrinterIP(ip);
        localStorage.setItem('printerIP', ip);
    };

    const handlePrinterPortChange = (e) => {
        const port = e.target.value;
        setPrinterPort(port);
        localStorage.setItem('printerPort', port);
    };

    const handleTrialModeChange = (e) => {
        const enabled = e.target.checked;
        setTrialMode(enabled);
        localStorage.setItem('printerTrialMode', JSON.stringify(enabled));
    };

    const handlePrintEjournal = () => {
        print('printer', 'ejournal', {})
        setStatusMessage('Electronic journal sent to printer...');
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">Network Printer Settings</Typography>
            <TextField label="Printer IP Address" value={printerIP} onChange={handlePrinterIPChange} fullWidth />
            <TextField label="Printer Port" value={printerPort} onChange={handlePrinterPortChange} fullWidth />
            <TextField label="Test Message" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} fullWidth />
            <Typography variant="h5" fontWeight="regular">
                Printer: {status}
            </Typography>
            <Button variant="contained" color="primary" onClick={handlePrintTest}>
                Print Test Message
            </Button>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <FormControlLabel
                    control={<Switch checked={trialMode} onChange={handleTrialModeChange} />}
                    label={
                        <Box>
                            <Typography variant="body1" fontWeight="bold">
                                Trial Mode (Paper Saver)
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                When enabled: prints receipt 1 time only. When disabled: prints receipt 3 times (normal operation).
                            </Typography>
                        </Box>
                    }
                />
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body1" fontWeight="bold" mb={1}>
                    Maintenance
                </Typography>
                <Button
                    variant="outlined"
                    color="warning"
                    onClick={handlePrintEjournal}
                    fullWidth
                >
                    Print Electronic Journal
                </Button>
                <Typography variant="body2" color="textSecondary" mt={1}>
                    Prints the complete electronic journal (audit log) of all transactions.
                </Typography>
            </Box>

            {statusMessage && (
                <Typography variant="body1" color="success">
                    {statusMessage}
                </Typography>
            )}
        </Box>
    );
};

export default PrinterWrapper(PrinterSettings);
