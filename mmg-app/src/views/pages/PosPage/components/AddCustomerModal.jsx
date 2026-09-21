import React from 'react';
import { Dialog } from '@mui/material';
import CustomerForm from '../../CustomerPage/components/CustomerForm';

const AddCustomerModal = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        {open && <CustomerForm onClose={onClose} />}
    </Dialog>
);

export default AddCustomerModal;
