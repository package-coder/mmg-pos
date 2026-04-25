import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog } from '@mui/material';
import CustomerForm from '../../CustomerPage/components/CustomerForm';

const AddCustomerModal = ({ open, onClose, onAddCustomer }) => {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const onSubmit = (data) => {
        onAddCustomer(data);
        reset();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <CustomerForm />
        </Dialog>
    );
};

export default AddCustomerModal;
