import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    TextField,
    Button,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';

const Reconciliation = () => {
    const [beginningBalance, setBeginningBalance] = useState(500); // Example beginning balance
    const [transactions, setTransactions] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [manualAdjustment, setManualAdjustment] = useState(0);
    const [cashOnHand, setCashOnHand] = useState(0);
    const [endOfDayBalance, setEndOfDayBalance] = useState(0);

    useEffect(() => {
        // Mock data for transactions and distributions
        const mockTransactions = [
            { id: 1, amount: 150.0, description: 'Sale #1' },
            { id: 2, amount: 200.0, description: 'Sale #2' },
            { id: 3, amount: 75.0, description: 'Sale #3' }
        ];

        const mockDistributions = [
            { id: 1, amount: 30.0, description: 'Return #1' },
            { id: 2, amount: 50.0, description: 'Cash Withdrawal' }
        ];

        setTransactions(mockTransactions);
        setDistributions(mockDistributions);
    }, []);

    useEffect(() => {
        // Calculate total transactions and distributions
        const totalTransactions = transactions.reduce((acc, txn) => acc + txn.amount, 0);
        const totalDistributions = distributions.reduce((acc, dist) => acc + dist.amount, 0);

        // Calculate end-of-day balance
        const calculatedEndOfDayBalance = beginningBalance + totalTransactions - totalDistributions + manualAdjustment;
        setEndOfDayBalance(calculatedEndOfDayBalance);

        // Calculate cash on hand
        setCashOnHand(calculatedEndOfDayBalance);
    }, [beginningBalance, transactions, distributions, manualAdjustment]);

    const handleGenerateReport = () => {
        // Logic to generate reconciliation report
        const report = {
            beginningBalance,
            transactions,
            distributions,
            manualAdjustment,
            endOfDayBalance,
            cashOnHand,
            cashierId: '12345',
            dateTime: new Date().toLocaleString()
        };
        console.log(report);
    };

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Reconciliation
            </Typography>
            <Paper style={{ padding: 16 }}>
                <Typography variant="h6">Balances</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField
                            label="Openning Fund"
                            type="number"
                            value={beginningBalance}
                            onChange={(e) => setBeginningBalance(parseFloat(e.target.value))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="h6">End of Day Balance: {endOfDayBalance.toFixed(2)}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Paper style={{ padding: 16, marginTop: 16 }}>
                <Typography variant="h6">Transactions</Typography>
                <TableContainer component={Paper} style={{ marginTop: 16 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Description</TableCell>
                                <TableCell>Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell>{txn.description}</TableCell>
                                    <TableCell>{txn.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper style={{ padding: 16, marginTop: 16 }}>
                <Typography variant="h6">Distributions</Typography>
                <TableContainer component={Paper} style={{ marginTop: 16 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Description</TableCell>
                                <TableCell>Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {distributions.map((dist) => (
                                <TableRow key={dist.id}>
                                    <TableCell>{dist.description}</TableCell>
                                    <TableCell>{dist.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper style={{ padding: 16, marginTop: 16 }}>
                <Typography variant="h6">Manual Adjustments</Typography>
                <TextField
                    label="Manual Adjustment"
                    type="number"
                    value={manualAdjustment}
                    onChange={(e) => setManualAdjustment(parseFloat(e.target.value))}
                    fullWidth
                />
            </Paper>

            <Paper style={{ padding: 16, marginTop: 16 }}>
                <Typography variant="h6">Cash On Hand</Typography>
                <Typography variant="body1">{cashOnHand.toFixed(2)}</Typography>
            </Paper>

            <Button variant="contained" color="primary" style={{ marginTop: 16 }} onClick={handleGenerateReport}>
                Generate Reconciliation Report
            </Button>
        </Container>
    );
};

export default Reconciliation;
