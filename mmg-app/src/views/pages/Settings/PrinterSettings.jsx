import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import axios from 'axios';
import PrinterProvider, { PrinterWrapper, usePrinter } from 'providers/PrinterProvider';

const PrinterSettings = () => {
    const [printerIP, setPrinterIP] = useState('');
    const [printerPort, setPrinterPort] = useState('');
    const [testMessage, setTestMessage] = useState('Test print message');
    const [statusMessage, setStatusMessage] = useState('');
    const { print, status } = usePrinter()

    useEffect(() => {
        const savedPrinterIP = localStorage.getItem('printerIP');
        const savedPrinterPort = localStorage.getItem('printerPort');

        if (savedPrinterIP) {
            setPrinterIP(savedPrinterIP);
        }
        if (savedPrinterPort) {
            setPrinterPort(savedPrinterPort);
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
            {statusMessage && (
                <Typography variant="body1" color="error">
                    {statusMessage}
                </Typography>
            )}
        </Box>
    );
};

export default PrinterWrapper(PrinterSettings);
