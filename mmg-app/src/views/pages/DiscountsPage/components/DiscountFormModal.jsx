import React from 'react';
import { Box, TextField, Button, Stack, Dialog, DialogContent, DialogTitle, MenuItem } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object().shape({
    name: yup.string().required('Discount name is required'),
    value: yup.number().required('Discount value is required').positive('Value must be positive'),
    type: yup.string().required('Discount type is required')
});

const DiscountFormModal = ({ open, onClose, onSubmit, discount }) => {
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: discount || {
            name: '',
            description: ''
        }
    });

    // Reset form when category prop changes
    React.useEffect(() => {
        reset(
            discount || {
                name: '',
                description: ''
            }
        );
    }, [discount, reset]);

    const handleFormSubmit = (data) => {
        onSubmit(data);
        onClose();
    };

    const handleDelete = () => {
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>{discount ? 'Edit Discount' : 'Create New Discount'}</DialogTitle>
            <DialogContent>
                <Box pt={2}>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <Stack direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={2}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Discount Name"
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        fullWidth
                                        margin="normal"
                                    />
                                )}
                            />
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Description"
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                        fullWidth
                                        margin="normal"
                                        multiline
                                        rows={4}
                                    />
                                )}
                            />
                            <Controller
                                name="value"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Discount Value"
                                        type="number"
                                        error={!!errors.value}
                                        helperText={errors.description?.message}
                                        fullWidth
                                    />
                                )}
                            />
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <TextField select {...field} label="Discount Type" variant="outlined" fullWidth error={!!errors.value}
                                        helperText={errors.description?.message}>
                                        <MenuItem value="percentage">Percentage</MenuItem>
                                        <MenuItem value="fixed">Fixed</MenuItem>
                                    </TextField>
                                )}
                            />
                            <Stack direction="row" justifyContent="flex-end" alignItems="flex-start" spacing={1} sx={{ width: '100%' }}>
                                {/* {discount && (
                                    <Button variant="outlined" color="error" onClick={handleDelete}>
                                        Delete
                                    </Button>
                                )} */}
                                <Button type="submit" variant="contained" color="primary">
                                    Save
                                </Button>
                            </Stack>
                        </Stack>
                    </form>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default DiscountFormModal;
