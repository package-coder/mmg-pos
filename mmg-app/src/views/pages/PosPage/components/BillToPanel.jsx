import React, { useMemo } from 'react';
import { Autocomplete, CircularProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useQuery } from 'react-query';
import customer from 'api/customer';
import corporate from 'api/corporate';

export const BILL_TO_LABELS = {
    customer: 'Pay Later',
    corporate: 'Charge to Account'
};

// Bill To: who settles the sale. "Customer" = paid at the counter (the normal flow). "Charge to
// Account" = the sale goes on account to a payor - a customer (labelled "Pay Later") or a
// corporate (labelled "Charge to Account"); no tender is collected at checkout.
const BillToPanel = ({ mode, onModeChange, payor, onPayorChange, disabled, allowCharge = true }) => {
    const { data: customers, isLoading: loadingCustomers } = useQuery('customers', customer.GetAllCustomers, {
        enabled: mode === 'charge'
    });
    const { data: corporates, isLoading: loadingCorporates } = useQuery('corporates', corporate.GetAllCorporate, {
        enabled: mode === 'charge'
    });

    const options = useMemo(
        () => [
            ...[...(corporates || [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => ({ type: 'corporate', id: c._id, name: c.name })),
            ...[...(customers || [])]
                .sort((a, b) => a.firstName.localeCompare(b.firstName))
                .map((c) => ({
                    type: 'customer',
                    id: c._id,
                    name: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`
                }))
        ],
        [customers, corporates]
    );

    // The admin can switch the On Account payment method off (Settings > Payment Methods).
    if (!allowCharge) return null;

    const label = payor ? BILL_TO_LABELS[payor.type] : 'Charge to Account / Pay Later';

    return (
        <Stack direction="column" spacing={1.8}>
            <Typography variant="h4">Bill To</Typography>
            <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                color="primary"
                value={mode}
                disabled={disabled}
                onChange={(e, value) => value && onModeChange(value)}
            >
                <ToggleButton value="customer">Customer</ToggleButton>
                <ToggleButton value="charge">Charge to Account</ToggleButton>
            </ToggleButtonGroup>
            {mode === 'charge' && (
                <Autocomplete
                    blurOnSelect
                    disabled={disabled}
                    loading={loadingCustomers || loadingCorporates}
                    options={options}
                    groupBy={(option) => (option.type === 'corporate' ? 'Corporates' : 'Customers')}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={payor}
                    onChange={(e, value) => onPayorChange(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            variant="outlined"
                            fullWidth
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingCustomers || loadingCorporates ? <CircularProgress size={18} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                )
                            }}
                        />
                    )}
                />
            )}
        </Stack>
    );
};

export default BillToPanel;
