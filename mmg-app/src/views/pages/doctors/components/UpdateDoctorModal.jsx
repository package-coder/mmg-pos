import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import EditIcon from '@mui/icons-material/Edit';

import Grid from '@mui/material/Grid';
import { Checkbox, Divider, MenuItem, Stack, Typography } from '@mui/material';
import { Field, Formik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient } from 'react-query';
import TextField from 'ui-component/TextField';
import doctor from 'api/doctor';

const validationSchema = Yup.object().shape({
    address: Yup.string().required(),
    firstName: Yup.string().required(),
    lastName: Yup.string().required(),
    middleName: Yup.string().required(),
    gender: Yup.string().required(),
    age: Yup.number().required(),
    isMember: Yup.bool().notRequired()
});

export default function ({ initialValues }) {
    const [open, setOpen] = React.useState(false);

    const queryClient = useQueryClient();
    const { mutateAsync } = useMutation(doctor.UpdateDoctor);

    const handleClickOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const renderButton = () => (
        <Button onClick={handleClickOpen} startIcon={<EditIcon fontSize="small" />} variant="outlined" size="small">
            Edit
        </Button>
    );

    if (!open) return renderButton();

    return (
        <React.Fragment>
            {renderButton()}
            <Dialog open={open} maxWidth="xs" fullWidth onClose={handleClose}>
                <Formik
                    initialValues={initialValues}
                    onSubmit={(values, actions) => {
                        mutateAsync(values)
                            .then(() => {
                                queryClient.invalidateQueries('doctors');
                                handleClose();
                            })
                            .catch((e) => actions.setFieldError('submit', e))
                            .finally(() => actions.setSubmitting(false));
                    }}
                    validationSchema={validationSchema}
                >
                    {({ handleSubmit, submitForm, isSubmitting }) => (
                        <form noValidate onSubmit={handleSubmit}>
                            <DialogTitle sx={{ fontSize: '1.1rem' }}>Edit Doctor</DialogTitle>
                            <DialogContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={3}>
                                        <Typography className="required" variant="caption">
                                            Name
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={9}>
                                        <Stack spacing={2}>
                                            <TextField name="firstName" placeholder="First Name" />
                                            <TextField name="middleName" placeholder="Middle Name" />
                                            <TextField name="lastName" placeholder="Last Name" />
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography className="required" variant="caption">
                                            Others
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={9}>
                                        <Stack spacing={2}>
                                            <TextField select name="gender" label="Gender">
                                                <MenuItem value="M">Male</MenuItem>
                                                <MenuItem value="F">Female</MenuItem>
                                                <MenuItem value="O">Others</MenuItem>
                                            </TextField>
                                            <TextField name="age" placeholder="Age" />
                                            <TextField name="address" placeholder="Address" />
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider />
                                    </Grid>
                                    <Grid item xs={3} alignSelf="center">
                                        <Typography variant="caption">Member</Typography>
                                    </Grid>
                                    <Grid item xs={9}>
                                        <Field name="isMember">
                                            {({ field: { value, ...field } }) => <Checkbox checked={value} {...field} />}
                                        </Field>
                                    </Grid>
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={handleClose}>Cancel</Button>
                                <Button disableElevation disabled={isSubmitting} onClick={submitForm} size="small" variant="contained">
                                    Submit
                                </Button>
                            </DialogActions>
                        </form>
                    )}
                </Formik>
            </Dialog>
        </React.Fragment>
    );
}
