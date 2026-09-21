import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import MainCard from 'ui-component/cards/MainCard';
import payment_method from 'api/payment_method';
import { APP_ROLE } from 'api';

const KIND_LABELS = {
    cash: 'Cash',
    reference: 'Reference no.',
    'on-account': 'Charge / pay later'
};

const errorMessage = (e) => e?.response?.data?.message || 'Something went wrong. Please try again.';

// Name dialog shared by "New payment method" and rename.
const NameDialog = ({ open, title, initialName, submitLabel, onClose, onSubmit }) => {
    const [name, setName] = useState(initialName || '');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSubmit(name.trim());
            onClose();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="Name"
                    placeholder="e.g. GCash, Maya, Credit Card"
                    value={name}
                    inputProps={{ maxLength: 40 }}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    error={!!error}
                    helperText={error}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={submit} disabled={saving}>
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PaymentMethodSettings = () => {
    const queryClient = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [renaming, setRenaming] = useState(null);
    const [toggleError, setToggleError] = useState(null);
    // Methods are managed on the admin/cloud portal and synced down to branches; a branch server only shows them.
    const canManage = APP_ROLE === 'admin';

    const { data: methods, isLoading, isError } = useQuery('payment-methods-all', payment_method.GetAllPaymentMethods);

    const refresh = () => {
        queryClient.invalidateQueries('payment-methods-all');
        queryClient.invalidateQueries('payment-methods');
    };

    const { mutateAsync: createMethod } = useMutation(payment_method.CreatePaymentMethod, { onSuccess: refresh });
    const { mutateAsync: updateMethod, isLoading: updating } = useMutation(payment_method.UpdatePaymentMethod, { onSuccess: refresh });

    const toggle = async (method, active) => {
        setToggleError(null);
        try {
            await updateMethod({ code: method.code, active });
        } catch (e) {
            setToggleError(errorMessage(e));
        }
    };

    return (
        <MainCard
            title="Payment Methods"
            secondary={
                <Button variant="contained" startIcon={<AddIcon />} disabled={!canManage} onClick={() => setCreating(true)}>
                    New payment method
                </Button>
            }
        >
            <Stack spacing={2.5}>
                <Alert severity="info">
                    These are the payment methods cashiers can choose at checkout. Changes made here reach every branch on its next sync
                    (about 3 minutes). Cash and On Account are built in: you can rename On Account or switch it off, but not
                    delete either. Methods you add take a reference / approval number at checkout and are paid in full. Switching a method off hides it
                    from checkout only; past sales keep it.
                </Alert>

                {!canManage && (
                    <Alert severity="warning">Payment methods are managed from the admin portal. This branch only receives them by sync.</Alert>
                )}

                {toggleError && (
                    <Alert severity="error" onClose={() => setToggleError(null)}>
                        {toggleError}
                    </Alert>
                )}

                {isError && <Alert severity="error">Couldn&apos;t load payment methods.</Alert>}

                {isLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={28} />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    {['Name', 'Type', 'Available at checkout', ''].map((head) => (
                                        <TableCell key={head} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                                            {head.toUpperCase()}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {methods?.map((method) => (
                                    <TableRow key={method.code} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="body1" fontWeight={600}>
                                                    {method.name}
                                                </Typography>
                                                {method.system && <Chip size="small" label="Built-in" />}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{KIND_LABELS[method.kind] || method.kind}</TableCell>
                                        <TableCell>
                                            <Tooltip title={method.code === 'cash' ? 'Cash cannot be switched off' : ''}>
                                                <span>
                                                    <Switch
                                                        checked={method.active}
                                                        disabled={!canManage || method.code === 'cash' || updating}
                                                        onChange={(e) => toggle(method, e.target.checked)}
                                                    />
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Rename">
                                                <IconButton disabled={!canManage} onClick={() => setRenaming(method)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>

            {creating && (
                <NameDialog
                    open
                    title="New payment method"
                    submitLabel="Add"
                    onClose={() => setCreating(false)}
                    onSubmit={(name) => createMethod({ name })}
                />
            )}
            {renaming && (
                <NameDialog
                    open
                    title={`Rename ${renaming.name}`}
                    initialName={renaming.name}
                    submitLabel="Save"
                    onClose={() => setRenaming(null)}
                    onSubmit={(name) => updateMethod({ code: renaming.code, name })}
                />
            )}
        </MainCard>
    );
};

export default PaymentMethodSettings;
