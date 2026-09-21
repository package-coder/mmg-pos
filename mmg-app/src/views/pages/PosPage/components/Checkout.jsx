import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Card, Typography, Grid, Button, Stack, Divider, Modal, TextField, InputAdornment, IconButton, Chip, CircularProgress, Box, Avatar } from '@mui/material';
import { MdChevronLeft, MdClose, MdCalendarToday, MdPhone, MdLocationOn } from 'react-icons/md';
import Receipt from './Receipt';
import { useTheme } from '@emotion/react';
import { FaPesoSign } from 'react-icons/fa6';
import { IoIosCheckmarkCircle } from 'react-icons/io';
// api
import transaction from 'api/transaction';
import FooterWatermark from 'ui-component/FooterWatermark';
import { useCashierReport } from '..';
import ReceiptModal from './ReceiptModal';
import WithPrintMutation from 'views/utilities/Print';
import { useAuth } from 'providers/AuthProvider';
import print from 'api/print';
import { usePrinter } from 'providers/PrinterProvider';
import BillToPanel, { BILL_TO_LABELS } from './BillToPanel';

const schema = yup.object().shape({
    chequeNumber: yup
        .string()
        .matches(/^\d{6,}$/, 'Valid cheque number is required (at least 6 digits)')
        .required('Cheque number is required'),
    accountNumber: yup
        .string()
        .matches(/^\d{10,}$/, 'Valid account number is required (at least 10 digits)')
        .required('Account number is required'),
    accountName: yup.string().required('Account name is required'),
    bankName: yup.string().required('Bank name is required'),
    branchName: yup.string().required('Branch name is required'),
});

const Checkout = ({ combinedData, handleBack, handleSuccessTrans, ar }) => {
    const { display: showCustomerDisplay, getTerminalInfo } =  usePrinter()
    // const { mutate: showCustomerDisplay } = useMutation(print.Display)
    const [amountGiven, setAmountGiven] = useState('');
    // Bill To "Charge to Account": the whole sale goes on account to a payor, so there is no
    // tender to collect - the only payment method is 'on-account'.
    const customerData = combinedData?.customerData;
    const [billToMode, setBillToMode] = useState('customer');
    const [billToPayor, setBillToPayor] = useState(null);
    const isOnAccount = billToMode === 'charge';
    const needsTender = !isOnAccount;
    const billTo = isOnAccount && billToPayor ? { type: billToPayor.type, id: billToPayor.id, name: billToPayor.name } : null;
    const [paymentMethod, setPaymentMethod] = useState(ar ? 'charge' : 'cash');
    const activeMethod = isOnAccount ? 'on-account' : paymentMethod;
    // Charge to Account needs a payor before it can be submitted.
    const missingPayor = isOnAccount && !billTo;
    const [receiptOpen, setReceiptOpen] = useState(false);
    const tenderFieldRef = useRef(null);
    const [isChipClicked, setIsChipClicked] = useState(false);
    const [loading, setLoading] = useState(false);
    // One key per mount of this checkout screen (i.e. per Pay attempt) — sent with the create
    // request so the backend can recognize a retried/duplicated submission (double-click that
    // outraces the `loading` state re-render, a dropped response that gets resent, etc.) as the
    // same sale instead of creating a second transaction and burning a second invoice number.
    const idempotencyKeyRef = useRef(
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    // Guards against a second handlePayClick firing before the `loading` state above has
    // re-rendered the Pay button as disabled (state updates aren't synchronous, so a fast
    // double-click/double-tap can call this twice in the same tick). Checked and set
    // synchronously as the very first thing in the handler, unlike `loading`.
    const isSubmittingRef = useRef(false);
    const paymentTypes = ['cash', 'cheque'];

    // const paymentTypes = ['cash', 'cheque',  'charge'];
    // const paymentTypes = ['cash', 'cheque',  'charge', 'credit card', 'debit card', 'e-wallet',];

    const { refetch: refetchCashierReport } = useCashierReport()
    const queryClient = useQueryClient();

    const { branch } = useAuth();

    const editTransactionMutation = useMutation(transaction.CreateTransactionV2, {
        onMutate: async (updatedTransaction) => {
            await queryClient.cancelQueries('transactions');
            const previousTransaction = queryClient.getQueryData('transactions');
            queryClient.setQueryData('transactions', (old) =>
                old?.map((cat) => (cat._id === updatedTransaction._id ? updatedTransaction : cat))
            );
            return { previousTransaction };
        },
        onError: (err, updatedService, context) => {
            queryClient.setQueryData('transactions', context.previousTransaction);
            toast.error('Error saving the transaction.');
        },
        onSettled: () => {
            queryClient.invalidateQueries('transactions');
        }
    });

    const theme = useTheme();

    useEffect(() => {
        tenderFieldRef.current?.focus();
    }, [combinedData]);

    useEffect(() => {
        showCustomerDisplay('total', { total: combinedData?.paymentDue })
    }, [])

    // Function to determine if a payment method should be disabled
    const isDisabled = (item) => {
        const lowerCaseItem = item.toLowerCase();
        if (ar) {
            return ['cash', 'credit card', 'debit card', 'cheque', 'e-wallet'].includes(lowerCaseItem);
        } else {
            return ['credit card', 'debit card', 'e-wallet', 'charge'].includes(lowerCaseItem);
        }
    };

    useEffect(() => {
        // Update the payment method if needed
        if (ar && paymentMethod !== 'Charge') {
            setPaymentMethod('Charge');
        } else if (!ar && paymentMethod === 'Charge') {
            setPaymentMethod('Cash'); // or any default value
        }
    }, [ar, paymentMethod]);

    const {
        control,
        formState: { errors, isValid },
        trigger,
        handleSubmit,
    } = useForm();

    useEffect(() => {
        const handleKeyPress = (event) => {
            const key = event.key;
            const activeElement = document.activeElement;

            // Check if the active element is the chequeNumber input
            if (activeElement.name === 'chequeNumber' || activeElement.name === 'accountNumber' || activeElement.name === 'accountName' || activeElement.name === 'branchName' || activeElement.name === 'bankName') {
                return; // Exit the function if focused on chequeNumber
            }

            if (key >= '0' && key <= '9') {
                if (isOnAccount) return;
                event.preventDefault();
                handleAmountClick(undefined, Number(key));
            } else if (key === 'Backspace') {
                handleClearClick();
            } else if (key === 'Enter') {
                event.preventDefault();
                if (!(needsTender && amountGiven < combinedData?.paymentDue) && !missingPayor && !loading) {
                    handleSubmit(handlePayClick)();
                }
            } else if (key === 'Escape') {
                event.preventDefault();
                handleBack('back');
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [amountGiven, loading]);


    const handleAmountClick = ({ add, exact, reset } = { add: false, exact: false, reset: false }, value = 0) => {
        if (reset) {
            setAmountGiven(0);
            return;
        }
        if (exact) {
            setAmountGiven(combinedData?.paymentDue);
            return;
        }
        if (add) {
            setAmountGiven((amount) => Number(amount) + value);
            return;
        }

        setAmountGiven((amount) => Number(amount) * 10 + value);
        setIsChipClicked(true);
    };

    const handleClearClick = () => {
        setAmountGiven('');
    };

    const calculateChange = (amountGiven) => {
        const change = amountGiven - combinedData?.paymentDue;
        return change < 0 ? 0 : change.toFixed(2);
    };

    const getChangeColor = (amountGiven) => {
        const change = amountGiven - combinedData?.paymentDue;
        return change < 0 ? 'error.main' : 'success.dark';
    };

    const buildNewData = (value, amountGiven) => {
        const baseData = {
            ...combinedData,
            id: combinedData?.id,
            customerData: combinedData?.customerData,
            transactionNo: combinedData?.transactionNumber,
            transactionDate: combinedData?.transactionDate,
            services: combinedData?.items,
            discountApplied: combinedData?.discountApplied,
            status: 'Completed'
        };

        const paymentDetails = {
            subTotal: combinedData?.subTotal,
            paymentDue: combinedData?.paymentDue,
            change: calculateChange(amountGiven),
            tenderAmount: amountGiven
        };

        switch (value) {
            case 'on-account':
                return {
                    ...baseData,
                    billTo,
                    paymentDetails: {
                        subTotal: combinedData?.subTotal,
                        paymentDue: combinedData?.paymentDue,
                        change: 0,
                        tenderAmount: combinedData?.paymentDue,
                        tenderType: value
                    }
                };
            case 'cash':
                return {
                    ...baseData,
                    paymentDetails: {
                        ...paymentDetails,
                        tenderType: value
                    }
                };
            case 'cheque':
                return {
                    ...baseData,
                    paymentDetails: {
                        ...paymentDetails,
                        ...control._formValues,
                        tenderType: value
                    }
                };
            case 'charge':
                return {
                    ...baseData,
                    paymentDetails: {
                        ...paymentDetails,
                        tenderType: value
                    }
                };
            default:
                throw new Error('Invalid payment type');
        }
    };

    const handlePayClick = async () => {
        if (isSubmittingRef.current) {
            return;
        }
        isSubmittingRef.current = true;
        setLoading(true);
        try {
            // Invoice numbers must be sequential per accredited terminal (BIR PTU rule) — the
            // terminal's PTU lives only in terminal.json on this workstation, read via the
            // helper app. If it can't be reached, we cannot legally issue an invoice number,
            // so the sale is blocked rather than silently falling back to a shared sequence.
            const terminalInfo = await getTerminalInfo();
            if (!terminalInfo?.PTU_NO) {
                toast.error(
                    'Cannot complete sale: unable to reach this terminal\'s printer helper to confirm its accreditation (PTU). Check that the helper app is running, then try again.'
                );
                return;
            }

            const newData = buildNewData(activeMethod, amountGiven);
            await editTransactionMutation.mutateAsync({
                ...newData,
                branchId: branch.id,
                ptuNumber: terminalInfo.PTU_NO,
                min: terminalInfo.MIN,
                sn: terminalInfo.SN,
                idempotencyKey: idempotencyKeyRef.current
            });

            showCustomerDisplay('next')

            await refetchCashierReport()
            setReceiptOpen(true);
            handleSuccessTrans('success');
        } catch (error) {
            console.error('Transaction mutation failed', error);
            // Handle the error (e.g., show a specific error message based on error type)
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const customerTypeLabels = {
        member: 'Member',
        'non-member': 'Non-Member',
        seniorcitizenpwd: 'Senior Citizen / PWD',
        'officer-bod': 'Officer (BOD)',
        'officer-gm': 'Officer (GM)',
        'officer-treasurer': 'Officer (Treasurer)',
        'officer-committer-officers': 'Officer',
        'associate-member': 'Associate Member',
        'solo-parent': 'Solo Parent',
        naac: 'NAAC'
    };

    const getInitials = (name) => {
        if (!name) return '--';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '--';
    };

    const discountApplied = combinedData?.discountApplied;
    const discountLabel = discountApplied
        ? discountApplied.name ||
          (discountApplied.type === 'percentage' ? `${discountApplied.value}% Discount` : 'Discount')
        : null;

    const renderGridItem = (label, value, highlight = false, sx) => (
        <>
            <Grid item xs={5}>
                <Typography variant="h4" fontWeight="bold" color={theme.palette.grey[500]}>
                    {label}
                </Typography>
            </Grid>
            <Grid item xs={7} sx={{ textWrap: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Typography variant="h2" sx={[highlight ? { color: 'success.dark' } : {}, sx]} textAlign="end">
                    {value}
                </Typography>
            </Grid>
        </>
    );

    return (
        <Stack
            bgcolor="primary.light"
            direction="row"
            justifyContent="center"
            alignItems='center'
            width="100%"
            sx={{
                height: { md: '100dvh' },
                minHeight: { xs: '100dvh', md: 0 },
                p: 2,
                boxSizing: 'border-box'
            }}
        >
            <Grid
                container
                spacing={2}
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="center"
                sx={{ height: { md: '100%' }, maxWidth: 1100, mx: 'auto' }}
            >
                <Grid item xs={12} md={6} sx={{ height: { md: '100%' } }}>
                    <Card sx={{ py: 3, px: 3, height: '100%', overflowY: 'auto' }}>
                        <Button
                            size="large"
                            startIcon={<MdChevronLeft />}
                            sx={{ mb: 2, bgcolor: 'grey.50' }}
                            onClick={() => handleBack('back')}
                        >
                            Back
                        </Button>
                        <Typography variant="h2" mb={2}>
                            Checkout
                        </Typography>
                        {!isOnAccount && (
                        <>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={2}>
                            <Typography variant="h4">
                                Payment Method{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                    (Choose primary tender)
                                </Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Currency: PHP (₱)
                            </Typography>
                        </Stack>
                        <Grid container spacing={1} mb={4}>
                            {paymentTypes.map((item, index) => (
                                <Grid key={item} item xs={4} sm={3} md={4} xl={4}>
                                    <Button
                                        startIcon={paymentMethod === item && <IoIosCheckmarkCircle style={{ marginRight: 6 }} />}
                                        sx={{
                                            py: 2,
                                            px: 1,
                                            borderRadius: 3,
                                            textWrap: 'nowrap',
                                            overflow: 'hidden',
                                            fontWeight: 'bold',
                                            color: 'grey.400',
                                            borderColor: 'grey.400',
                                            borderWidth: '2px !important',
                                            ...(isDisabled(item)
                                                ? {
                                                    backgroundColor: 'grey.50',
                                                    borderColor: 'transparent !important'
                                                }
                                                : {}),
                                            ...(paymentMethod === item
                                                ? {
                                                    borderWidth: '3px !important',
                                                    borderColor: 'primary.main',
                                                    color: 'primary.main'
                                                }
                                                : {})
                                        }}
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => setPaymentMethod(item)}
                                        disabled={isDisabled(item)}
                                    >
                                        {item}
                                    </Button>
                                </Grid>
                            ))}
                        </Grid>
                        </>
                        )}
                        <Typography variant="h4" mb={2}>
                            {' '}
                            Information
                        </Typography>
                        <Stack mb={3} p={2.5} bgcolor="grey.50" borderRadius={3}>
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 'bold' }}>
                                    {getInitials(combinedData?.customerData?.name)}
                                </Avatar>
                                <Box flex={1}>
                                    <Typography variant="h4" sx={{ textTransform: 'uppercase' }}>
                                        {combinedData?.customerData?.name || '---'}
                                    </Typography>
                                    {combinedData?.customerData?.id && (
                                        <Typography variant="caption" color="text.secondary">
                                            Customer ID: {combinedData?.customerData?.id}
                                        </Typography>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    {customerTypeLabels[combinedData?.customerData?.customerType] && (
                                        <Chip
                                            size="small"
                                            label={customerTypeLabels[combinedData?.customerData?.customerType]}
                                            color="info"
                                            variant="outlined"
                                        />
                                    )}
                                    {discountLabel && (
                                        <Chip size="small" label={`${discountLabel} Applied`} color="warning" variant="outlined" />
                                    )}
                                </Stack>
                            </Stack>
                            <Grid container spacing={2}>
                                {(combinedData?.customerData?.age || combinedData?.customerData?.birthDate) && (
                                    <Grid item xs={6}>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <MdCalendarToday style={{ marginTop: 3, color: theme.palette.grey[500] }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Age &amp; Birth Date
                                                </Typography>
                                                <Typography variant="body1" fontWeight={600}>
                                                    {combinedData?.customerData?.age ? `${combinedData.customerData.age} yrs old` : '---'}
                                                    {combinedData?.customerData?.birthDate &&
                                                        combinedData?.customerData?.type === 'customer' &&
                                                        ` (DOB: ${combinedData.customerData.birthDate})`}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                )}
                                {combinedData?.customerData?.contactNumber && (
                                    <Grid item xs={6}>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <MdPhone style={{ marginTop: 3, color: theme.palette.grey[500] }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Mobile No.
                                                </Typography>
                                                <Typography variant="body1" fontWeight={600}>{combinedData?.customerData?.contactNumber}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                )}
                                {combinedData?.customerData?.address && (
                                    <Grid item xs={12}>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <MdLocationOn style={{ marginTop: 3, color: theme.palette.grey[500] }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Address
                                                </Typography>
                                                <Typography variant="body1" fontWeight={600}>{combinedData?.customerData?.address}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                )}
                            </Grid>
                        </Stack>
                        <Typography variant="h4" mb={2}>
                            Order Summary
                        </Typography>
                        <Stack mb={4} spacing={1} p={2.5} bgcolor="grey.50" borderRadius={3}>
                            <Stack spacing={1} sx={{ maxHeight: 180, overflowY: 'auto' }}>
                                {combinedData?.items?.map((item, index) => (
                                    <Stack key={item._id || index} direction="row" justifyContent="space-between">
                                        <Typography variant="body1">
                                            {item.name} {item.qty > 1 && `x${item.qty}`}
                                        </Typography>
                                        <Typography variant="body1">
                                            ₱{new Intl.NumberFormat().format(item.amount)}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body1">Subtotal</Typography>
                                <Typography variant="body1">₱{new Intl.NumberFormat().format(combinedData?.subTotal)}</Typography>
                            </Stack>
                            {discountApplied?.totalDiscount > 0 && (
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body1" color="success.dark">
                                        {discountLabel}
                                    </Typography>
                                    <Typography variant="body1" color="success.dark">
                                        - ₱{new Intl.NumberFormat().format(discountApplied.totalDiscount)}
                                    </Typography>
                                </Stack>
                            )}
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="h4">Net Payable</Typography>
                                <Typography variant="h2" color="primary.main">
                                    ₱{new Intl.NumberFormat().format(combinedData?.paymentDue)}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} sx={{ height: { md: '100%' } }}>
                    <Card sx={{ py: 3, px: 3, height: '100%', overflowY: 'auto' }}>
                        <Stack mb={2} p={2} bgcolor="grey.50" borderRadius={3}>
                            <BillToPanel
                                mode={billToMode}
                                onModeChange={(mode) => {
                                    setBillToMode(mode);
                                    if (mode === 'customer') {
                                        setBillToPayor(null);
                                    } else if (!billToPayor && customerData?.id) {
                                        // Default the payor to the customer/corporate already selected on the POS screen.
                                        setBillToPayor({
                                            type: customerData.type === 'corporate' ? 'corporate' : 'customer',
                                            id: customerData.id,
                                            name: customerData.name
                                        });
                                    }
                                }}
                                payor={billToPayor}
                                onPayorChange={setBillToPayor}
                            />
                        </Stack>
                        <Grid container mb={2} spacing={2}>
                            {renderGridItem(
                                'Total balance: ',
                                <>
                                    <FaPesoSign
                                        style={{ marginLeft: '3px', marginBottom: -2, marginRight: '2px', fontSize: '1.25rem' }}
                                    />
                                    {new Intl.NumberFormat().format(combinedData?.paymentDue)}
                                </>,
                                false,
                                { color: 'primary.main', fontSize: '1.5rem' }
                            )}
                            <Grid item xs={12} my={1}>
                                <Divider />
                            </Grid>
                            {isOnAccount && billTo && (
                                <Grid item xs={12}>
                                    <Stack p={2.5} spacing={0.5} bgcolor="grey.50" borderRadius={3}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {BILL_TO_LABELS[billTo.type].toUpperCase()}
                                        </Typography>
                                        <Typography variant="h4" sx={{ textTransform: 'uppercase' }}>
                                            {billTo.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            No payment is collected now. The full amount is recorded as ON-ACCOUNT.
                                        </Typography>
                                    </Stack>
                                </Grid>
                            )}
                            {needsTender && renderGridItem(
                                'Change: ',
                                <>
                                    <FaPesoSign
                                        style={{ marginLeft: '3px', marginBottom: -2, marginRight: '2px', fontSize: '1.25rem' }}
                                    />
                                    {new Intl.NumberFormat().format(calculateChange(amountGiven))}
                                </>,
                                false,
                                { color: getChangeColor(amountGiven), fontSize: '1.5rem' }
                            )}
                            <Grid item xs={12}></Grid>
                            {needsTender && (
                            <Grid item xs={12}>
                                <TextField
                                    ref={tenderFieldRef}
                                    autoFocus
                                    value={new Intl.NumberFormat().format(Number(amountGiven))}
                                    onChange={(e) => {
                                        setAmountGiven(e.target.value.replace(/[^\ .0-9]/g, ''));
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <FaPesoSign
                                                        style={{ marginBottom: 1, fontSize: '1rem', color: theme.palette.grey[400] }}
                                                    />
                                                    <Typography variant="h4" fontWeight="bold" color="grey.400">
                                                        Tender Amount
                                                    </Typography>
                                                </Stack>
                                            </InputAdornment>
                                        ),
                                        endAdornment: amountGiven ? (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={handleClearClick}>
                                                    <MdClose />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null
                                    }}
                                    inputProps={{
                                        sx: {
                                            '&::placeholder': {
                                                fontSize: '1rem'
                                            }
                                        }
                                    }}
                                    sx={{
                                        '& .MuiInputBase-root': {
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            py: 0.5
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'primary.main',
                                            borderWidth: 2
                                        },
                                        '& input': {
                                            textAlign: 'right',
                                            mr: 1
                                        }
                                    }}
                                    fullWidth
                                />
                            </Grid>
                            )}
                        {needsTender && (
                        <Grid item xs={12}>
                                    <Stack direction="row" spacing={1}>
                                        {[
                                            { value: 'Exact', exact: true },
                                            { value: 100, peso: true },
                                            { value: 200, peso: true },
                                            { value: 500, peso: true },
                                            { value: 1000, peso: true }
                                        ].map((item) => (
                                            <Chip
                                                icon={item.peso && <FaPesoSign />}
                                                label={item.value}
                                                onClick={() => handleAmountClick({ add: true, exact: item.exact }, item.value)}
                                                size="medium"
                                                sx={[
                                                    {
                                                        flex: 1,
                                                        bgcolor: 'grey.100',
                                                        fontSize: '0.875rem'
                                                    },
                                                    item.exact ? { color: 'primary.dark' } : {}
                                                ]}
                                                disabled={isChipClicked || combinedData?.subTotal > item.value}
                                            />
                                        ))}
                                    </Stack>
                                </Grid>
                        )}
                            {activeMethod === 'cash' && (
                                <>
                                
                                    <Grid item xs={12}>
                                        <Grid container>
                                            {[7, 8, 9, 4, 5, 6, 1, 2, 3, '00', 0].map((item) => (
                                                <Grid item xs={4}>
                                                    <Button
                                                        sx={{
                                                            py: 1.25,
                                                            borderRadius: 3,
                                                            textWrap: 'nowrap',
                                                            overflow: 'hidden',
                                                            fontWeight: 'bold',
                                                            fontSize: '1rem'
                                                        }}
                                                        fullWidth
                                                        variant="outlined"
                                                        onClick={() => handleAmountClick(undefined, item)}
                                                    >
                                                        {item}
                                                    </Button>
                                                </Grid>
                                            ))}
                                            <Grid item xs={4}>
                                                <Button
                                                    sx={{
                                                        py: 1.25,
                                                        borderRadius: 3,
                                                        textWrap: 'nowrap',
                                                        overflow: 'hidden',
                                                        fontWeight: 'bold',
                                                        fontSize: '1rem'
                                                    }}
                                                    onClick={() => handleAmountClick({ reset: true })}
                                                    fullWidth
                                                    variant="outlined"
                                                >
                                                    Reset
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                </>
                            )}
                            {activeMethod === 'cheque' && (
                                <Grid item xs={12}>
                                    <Stack direction='column' spacing={1.5} width='100%'>
                                        <Controller
                                                name="chequeNumber"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: 'Cheque Number is required',
                                                    pattern: { value: /^[0-9]+$/, message: 'Invalid Cheque Number' }
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Cheque Number"
                                                        fullWidth
                                                        onBlur={() => trigger('chequeNumber')}
                                                        error={!!errors.chequeNumber}
                                                        helperText={errors.chequeNumber ? errors.chequeNumber.message : ''}

                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="accountNumber"
                                                control={control}
                                                defaultValue=""
                                                rules={{ required: 'Account Number is required' }}
                                                onFocus={() => {
                                                    trigger('accountNumber');
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Account Number"
                                                        fullWidth
                                                        onBlur={() => trigger('accountNumber')}
                                                        error={!!errors.accountName}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="accountName"
                                                control={control}
                                                defaultValue=""
                                                rules={{ required: 'Account Name is required' }}
                                                onFocus={() => {
                                                    trigger('accountName');
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Account Name"
                                                        fullWidth
                                                        onBlur={() => trigger('accountName')}
                                                        error={!!errors.accountName}
                                                        helperText={errors.accountName ? errors.accountName.message : ''}

                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="bankName"
                                                control={control}
                                                defaultValue=""
                                                rules={{ required: 'Bank Name is required' }}
                                                onFocus={() => {
                                                    trigger('bankName');
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Bank Name"
                                                        fullWidth
                                                        onBlur={() => trigger('bankName')}
                                                        error={!!errors.bankName}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="branchName"
                                                control={control}
                                                defaultValue=""
                                                rules={{ required: 'Branch Name is required' }}
                                                onFocus={() => {
                                                    trigger('branchName');
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Branch Name"
                                                        fullWidth
                                                        onBlur={() => trigger('branchName')}
                                                        error={!!errors.branchName}
                                                    />
                                                )}
                                            />
                                    </Stack>
                                </Grid>
                            )}
                        
                        </Grid>
                        <Button
                            sx={{ py: 1.5 }}
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleSubmit(handlePayClick)}
                            disabled={(needsTender && amountGiven < combinedData?.paymentDue) || missingPayor || loading}
                        >
                            {loading ? 'LOADING' : `${isOnAccount ? 'CHARGE' : 'PAY'} ₱${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2 }).format(combinedData?.paymentDue || 0)}`}
                        </Button>
                        <Stack direction="row" justifyContent="space-between" mt={1}>
                            <Typography variant="caption" color="text.secondary">
                                Hotkeys: Enter to Pay
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Esc to Cancel
                            </Typography>
                        </Stack>
                    </Card>
                    
                </Grid>
            </Grid>
            {
                receiptOpen && (
                    <WithPrintMutation>
                        {(props) => (
                            <ReceiptModal
                                {...props}
                                forceShow
                                open
                                onClose={() => handleBack('success')}
                                transaction={editTransactionMutation?.data} 
                            />
                        )}
                    </WithPrintMutation>
                )
            }
            {/* {
                receiptOpen && (
                    <Modal
                        open
                        onClose={() => setReceiptOpen(false)}
                        aria-labelledby="receipt-modal-title"
                        aria-describedby="receipt-modal-description"
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
                                <Receipt
                                    combinedData={{ ...combinedData, invoiceNumber: editTransactionMutation?.data?.invoiceNumber, ...editTransactionMutation?.data }}
                                    amountGiven={parseFloat(amountGiven)}
                                    change={parseFloat(calculateChange(amountGiven))}
                                    tenderType={activeMethod}
                                    data={editTransactionMutation?.data}
                                    handleBack={handleBack}
                                    setReceiptOpen={setReceiptOpen}
                                />
                            </div>
                        </div>
                    </Modal>
                )
            }
             */}

            <FooterWatermark />
        </Stack>
    );
};

export default Checkout;
