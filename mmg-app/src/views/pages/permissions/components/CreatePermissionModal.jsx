import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AddIcon from '@mui/icons-material/Add';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import Grid from '@mui/material/Grid';
import { InputAdornment, Typography } from '@mui/material';

export default function () {
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <React.Fragment>
            <Button startIcon={<AddIcon />} onClick={handleClickOpen} variant="contained" color="primary" size="small">
                New Permission
            </Button>
            <Dialog
                open={open}
                maxWidth="xs"
                fullWidth
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: (event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const formJson = Object.fromEntries(formData.entries());
                        const email = formJson.email;
                        console.log(email);
                        handleClose();
                    }
                }}
            >
                <DialogTitle sx={{ fontSize: '1.1rem', mb: 1 }}>New Permission</DialogTitle>

                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={3}>
                            <Typography variant="caption">Permission</Typography>
                        </Grid>
                        <Grid item xs={9}>
                            <TextField fullWidth hiddenLabel size="small" placeholder="Name" />
                        </Grid>
                        <Grid item xs={3}>
                            <Typography variant="caption">Permissions</Typography>
                        </Grid>
                        <Grid item xs={9}>
                            <TextField
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRoundedIcon sx={{ color: 'gray', fontSize: 18 }} />
                                        </InputAdornment>
                                    )
                                }}
                                fullWidth
                                hiddenLabel
                                size="small"
                                placeholder="Search"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button type="submit" size="small" variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
