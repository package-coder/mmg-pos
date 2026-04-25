// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import AuthCardWrapper from '../AuthCardWrapper';
import logo from '../../../assets/images/logo.jpg';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

// ================================|| AUTH3 - LOGIN ||================================ //

export default function () {
    const theme = useTheme();

    return (
        <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: 'calc(100vh - 68px)' }}>
            <Grid item sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
                <AuthCardWrapper>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item>
                            <img style={{ height: 35, maxWidth: 70 }} src={logo} loading="lazy" />
                            <Typography textAlign="start" color="primary" variant="h3" mb={0.5}>
                                Forgot password
                            </Typography>
                            <Typography variant="caption" fontSize="16px" textAlign={{ xs: 'center', md: 'inherit' }}>
                                User needs to create password on first login
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
                                <InputLabel htmlFor="outlined-adornment-password-login">Username</InputLabel>
                                <OutlinedInput id="outlined-adornment-password-login" name="password" label="Password" inputProps={{}} />
                            </FormControl>
                            <Box sx={{ mt: 2 }}>
                                <Button fullWidth size="large" type="submit" variant="contained" sx={{ py: 1.2, borderRadius: 3 }}>
                                    Submit
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </AuthCardWrapper>
            </Grid>
        </Grid>
    );
}
