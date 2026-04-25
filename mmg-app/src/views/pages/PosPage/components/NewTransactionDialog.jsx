import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Typography } from '@mui/material';

const NewTransactionDialog = ({ open, handleClose, handleConfirm }) => {
    return (
        <Dialog open={open} onClose={handleClose} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
            <DialogTitle>
            <Typography variant="h4">Create New Transaction</Typography>
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">Are you sure you want to create a new transaction?</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleConfirm} color="primary" autoFocus>
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NewTransactionDialog;
