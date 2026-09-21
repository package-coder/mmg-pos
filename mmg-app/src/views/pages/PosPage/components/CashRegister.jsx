import React, { useState } from 'react';
import {
    Button,
    Typography,
    Grid,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Card,
    Stack,
    Chip,
    IconButton,
    Avatar,
    Divider
} from '@mui/material';
import { MdChevronLeft } from 'react-icons/md';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { FaPesoSign } from 'react-icons/fa6';
import { useMutation } from 'react-query';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import cashier_report from 'api/cashier_report';
import { useCashierReport } from '..';
import FooterWatermark from 'ui-component/FooterWatermark';
import Currency from 'ui-component/Currency';
import { useAuth } from 'providers/AuthProvider';

// Bills first (largest to smallest), then coins/centavos — matches how a drawer is physically
// counted and how the two "Paper Bills" / "Coins & Centavos" subtotals below are grouped.
const denominations = [
    { value: 1000, label: 'Php 1,000', type: 'Bill', group: 'bills' },
    { value: 500, label: 'Php 500', type: 'Bill', group: 'bills' },
    { value: 200, label: 'Php 200', type: 'Bill', group: 'bills' },
    { value: 100, label: 'Php 100', type: 'Bill', group: 'bills' },
    { value: 50, label: 'Php 50', type: 'Bill', group: 'bills' },
    { value: 20, label: 'Php 20', type: 'Bill / Coin', group: 'bills' },
    { value: 10, label: 'Php 10', type: 'Coin', group: 'coins' },
    { value: 5, label: 'Php 5', type: 'Coin', group: 'coins' },
    { value: 1, label: 'Php 1', type: 'Coin', group: 'coins' },
    { value: 0.25, label: 'Php 0.25', type: '25¢ Centavo', group: 'coins' },
    { value: 0.1, label: 'Php 0.10', type: '10¢ Centavo', group: 'coins' },
    { value: 0.05, label: 'Php 0.05', type: '5¢ Centavo', group: 'coins' }
];

// Pure convenience shortcuts — fill the same fields a cashier would fill by hand, nothing is
// submitted until "Confirm Entries" is pressed, and every field stays freely editable afterward.
const QUICK_PRESETS = [
    {
        label: 'Standard',
        total: 5000,
        counts: { 500: 5, 100: 15, 50: 20 } // 2500 + 1500 + 1000
    },
    {
        label: 'Heavy Change',
        total: 3000,
        counts: { 50: 30, 20: 50, 10: 50 } // 1500 + 1000 + 500
    }
];

const getInitials = (name) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

const CashRegister = ({ initialValues, isEndingBalanceFlag, handleBack }) => {
    const navigate = useNavigate();
    const { branch, user } = useAuth();
    const [entries, setEntries] = useState(initialValues ?? {});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isEndingBalance] = useState(isEndingBalanceFlag);
    const cashierReportContext = useCashierReport();
    const report = cashierReportContext?.report;
    const { refetch } = cashierReportContext || {};

    const [submitting, setSubmitting] = useState(false);
    const [withdraw, setWithdraw] = useState(0);
    const { mutateAsync: timeOut, isLoading: timeOutLoading } = useMutation(cashier_report.TimeOutCashierReport);
    const { mutateAsync: timeIn, isLoading: timeInLoading } = useMutation(cashier_report.TimeInCashierReport);

    const loading = timeOutLoading || timeInLoading || submitting;

    const total = Object.entries(entries).reduce((sum, [cash, count]) => sum + parseFloat(cash) * parseFloat(count), 0);
    const billsTotal = denominations
        .filter((d) => d.group === 'bills')
        .reduce((sum, d) => sum + d.value * (entries[d.value.toString()] || 0), 0);
    const coinsTotal = total - billsTotal;
    const netRetained = total - (withdraw || 0);

    const handleChange = (key, value) => {
        const number = Number(value);
        if (number < 0 || Number.isNaN(number)) return;

        const newEntries = { ...entries };
        if (number > 0) {
            newEntries[key] = number;
        } else {
            delete newEntries[key];
        }
        setEntries(newEntries);
    };

    const handleStep = (key, delta) => {
        const current = Number(entries[key] || 0);
        handleChange(key, current + delta);
    };

    const handleResetCounts = () => {
        setEntries({});
        setWithdraw(0);
    };

    const handleApplyPreset = (preset) => {
        setEntries(Object.fromEntries(Object.entries(preset.counts).map(([value, count]) => [value, count])));
    };

    const handleConfirm = () => {
        setConfirmOpen(false);

        if (!isEndingBalanceFlag) {
            setSubmitting(true);
            timeIn({ openingFund: { count: entries }, branchId: branch.id })
                .then(refetch)
                .finally(() => setSubmitting(false));

            return;
        }

        setSubmitting(true);
        timeOut({ endingCashCount: { count: entries }, withdraw, branchId: branch.id, id: report._id })
            .then(() => {
                // Only the PERSISTED branch is cleared here, not the in-memory one — the
                // X-Reading/Z-Reading screens this navigates to still need `branch` from
                // AuthProvider for the rest of this session. Clearing localStorage is what
                // makes branch selection reappear on the cashier's NEXT login (a fresh mount
                // re-reads it — see AuthProvider.jsx), rather than silently reusing a branch
                // whose shift has already ended.
                localStorage.removeItem('selectedBranch');
                navigate('x-report');
            })
            .finally(() => setSubmitting(false));
    };

    const renderDenominationRow = (denom) => {
        const key = denom.value.toString();
        const count = entries[key] || 0;
        const value = denom.value * count;

        return (
            <Stack key={key} direction="row" alignItems="center" spacing={2} sx={{ py: 1.25 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 130 }}>
                    <FaPesoSign size={14} color="#9e9e9e" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        {denom.value.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {denom.type}
                    </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton
                        size="small"
                        onClick={() => handleStep(key, -1)}
                        disabled={count <= 0}
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <RemoveIcon fontSize="inherit" />
                    </IconButton>
                    <input
                        id={`denom-elem-${denom.value}`}
                        type="number"
                        min={0}
                        value={count || ''}
                        placeholder="0"
                        onChange={(e) => handleChange(key, e.target.value)}
                        onKeyDown={(event) => {
                            const index = denominations.findIndex((d) => d.value === denom.value);
                            if (event.key === 'ArrowUp') {
                                event.preventDefault();
                                const prev = denominations[(index - 1 + denominations.length) % denominations.length];
                                document.getElementById(`denom-elem-${prev.value}`)?.focus();
                            } else if (event.key === 'Enter' || event.key === 'ArrowDown') {
                                event.preventDefault();
                                const next = denominations[(index + 1) % denominations.length];
                                document.getElementById(`denom-elem-${next.value}`)?.focus();
                            }
                        }}
                        style={{
                            width: 48,
                            textAlign: 'center',
                            border: '1px solid',
                            borderColor: '#e0e0e0',
                            borderRadius: 6,
                            padding: '4px 2px',
                            fontSize: '0.875rem'
                        }}
                    />
                    <IconButton size="small" onClick={() => handleStep(key, 1)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <AddIcon fontSize="inherit" />
                    </IconButton>
                </Stack>
                <Box flex={1} />
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80, textAlign: 'right' }}>
                    <Currency value={value} />
                </Typography>
            </Stack>
        );
    };

    return (
        <Stack bgcolor="grey.100" alignItems="center" sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
            <Card sx={{ p: { xs: 2.5, md: 4 }, width: '100%', maxWidth: 1200 }}>
                {/* Header */}
                <Stack direction="row" flexWrap="wrap" gap={2} justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h3" fontWeight={600}>
                            {branch?.name || 'Branch'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Cash Float & Terminal Operations
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                            {getInitials(`${user?.first_name || ''} ${user?.last_name || ''}`)}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                {user?.first_name} {user?.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {(user?.role?.name || '').toUpperCase()}
                            </Typography>
                        </Box>
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 3 }} />

                {/* Title */}
                <Stack direction="row" flexWrap="wrap" gap={2} justifyContent="space-between" alignItems="flex-start" mb={3}>
                    <Box>
                        <Button
                            size="small"
                            startIcon={<MdChevronLeft />}
                            sx={{ mb: 1 }}
                            onClick={isEndingBalance ? handleBack : () => navigate('/dashboard/home')}
                        >
                            Back
                        </Button>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="h2" fontWeight={600}>
                                {!isEndingBalance ? 'Opening Fund' : 'Ending Balance Entry'}
                            </Typography>
                            <Chip
                                size="small"
                                label={!isEndingBalance ? 'Drawer Float Entry' : 'End of Shift Cash Count'}
                                sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 500 }}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {!isEndingBalance
                                ? 'Record and verify physical cash currency before beginning your cashier shift.'
                                : 'Record and verify physical cash currency before completing your terminal drawer closure.'}
                        </Typography>
                    </Box>
                    <Box textAlign="right">
                        <Typography variant="body2" color="text.secondary">
                            Date:{' '}
                            {moment(report?.date).isValid() ? moment(report?.date).format('MMM DD, YYYY') : moment().format('MMM DD, YYYY')}
                        </Typography>
                        {isEndingBalance && report?.timeIn && (
                            <Typography variant="caption" color="text.secondary">
                                Time In: {moment(report.timeIn).format('hh:mm A')}
                            </Typography>
                        )}
                    </Box>
                </Stack>

                <Grid container spacing={4}>
                    {/* Left column */}
                    <Grid item xs={12} md={5}>
                        <Stack spacing={2.5}>
                            <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'info.light', borderColor: 'info.main' }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                    <HelpOutlineIcon fontSize="small" color="info" />
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Help & Drawer Guidelines
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                    Enter the quantity of each denomination in the fields on the right. The total value updates
                                    automatically. Review the breakdown before confirming — once submitted, this count is recorded against
                                    your shift.
                                </Typography>
                            </Card>

                            <Card variant="outlined" sx={{ p: 2.5 }}>
                                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                                    Total Entry Value
                                </Typography>
                                <Typography variant="h1" fontWeight={700} my={0.5}>
                                    <Currency value={total} />
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {!isEndingBalance ? 'Calculated drawer opening balance' : 'Sum of counted bills, coins, and centavos'}
                                </Typography>
                                <Grid container spacing={1.5} mt={1.5}>
                                    <Grid item xs={6}>
                                        <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Paper Bills
                                            </Typography>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                <Currency value={billsTotal} />
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Coins & Cents
                                            </Typography>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                <Currency value={coinsTotal} />
                                            </Typography>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Card>

                            {isEndingBalance && (
                                <Card variant="outlined" sx={{ p: 2.5 }}>
                                    <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                                        Withdraw
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                        <FaPesoSign color="#9e9e9e" />
                                        <input
                                            type="number"
                                            min={0}
                                            value={withdraw || ''}
                                            placeholder="0.00"
                                            onChange={(e) => setWithdraw(Math.max(0, parseFloat(e.target.value) || 0))}
                                            style={{
                                                width: '100%',
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 6,
                                                padding: '8px 10px',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                        Bank deposit drop, cashier envelope remittance, or transfer amount
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                Gross Counted Cash:
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                <Currency value={total} />
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                Less Cash Remittance (Withdraw):
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600} color="error.main">
                                                -<Currency value={withdraw || 0} />
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                Net Retained Float:
                                            </Typography>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                <Currency value={netRetained} />
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Card>
                            )}

                            <Stack spacing={1.5}>
                                <Button disabled={loading} variant="contained" size="large" onClick={() => setConfirmOpen(true)}>
                                    {loading ? 'Saving...' : !isEndingBalance ? 'Confirm Entries & Open Drawer' : 'Confirm Entries'}
                                </Button>
                                <Button variant="outlined" color="inherit" onClick={handleResetCounts} disabled={loading}>
                                    Reset / Clear Counts
                                </Button>
                            </Stack>
                        </Stack>
                    </Grid>

                    {/* Right column — currency breakdown */}
                    <Grid item xs={12} md={7}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                            <Typography variant="h4" fontWeight={600}>
                                Currency Breakdown
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {denominations.length} Philippine Peso (PHP) denominations
                            </Typography>
                        </Stack>

                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                            Banknotes (Bills)
                        </Typography>
                        <Divider sx={{ mb: 0.5 }} />
                        {denominations.filter((d) => d.group === 'bills').map(renderDenominationRow)}

                        <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mt={2}>
                            Coins & Centavos
                        </Typography>
                        <Divider sx={{ mb: 0.5 }} />
                        {denominations.filter((d) => d.group === 'coins').map(renderDenominationRow)}

                        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" mt={3}>
                            <Typography variant="caption" color="text.secondary">
                                Quick fill:
                            </Typography>
                            {QUICK_PRESETS.map((preset) => (
                                <Chip
                                    key={preset.label}
                                    size="small"
                                    variant="outlined"
                                    label={`${preset.label} ₱${preset.total.toLocaleString()}`}
                                    onClick={() => handleApplyPreset(preset)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Confirm Dialog */}
                <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ pt: 3 }}>
                        <Typography variant="h4" fontWeight={600}>
                            Confirm Entries
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Typography color="text.secondary" variant="body2" mb={2}>
                            Please review the entered denominations and their totals before confirming.
                        </Typography>
                        <Stack spacing={0.75}>
                            {denominations
                                .filter((d) => (entries[d.value.toString()] || 0) > 0)
                                .map((d) => (
                                    <Stack key={d.value} direction="row" justifyContent="space-between">
                                        <Typography variant="body2">
                                            ₱{d.value.toLocaleString()} × {entries[d.value.toString()]}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            <Currency value={d.value * entries[d.value.toString()]} />
                                        </Typography>
                                    </Stack>
                                ))}
                        </Stack>
                        <Divider sx={{ my: 1.5 }} />
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={700}>
                                Total
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={700}>
                                <Currency value={total} />
                            </Typography>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmOpen(false)} color="inherit">
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={handleConfirm}>
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Card>
            <FooterWatermark />
        </Stack>
    );
};

export default CashRegister;
