// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import AuthCardWrapper from '../AuthCardWrapper';
import logo from '../../../assets/images/logo.jpg';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Visibility from '@mui/icons-material/Visibility';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { useAuth } from 'providers/AuthProvider';
import { useState } from 'react';
import { Stack } from '@mui/system';
import { isArray } from 'lodash';
import { useLocation, useNavigate } from 'react-router-dom';
import FooterWatermark from 'ui-component/FooterWatermark';

// ================================|| AUTH3 - LOGIN ||================================ //

export default function () {
    const navigate = useNavigate();
    const { state } = useLocation();
    const redirect = state?.redirect;

    const { user, setBranch } = useAuth();
    const [selectedBranch, setSelectedBranch] = useState();

    const handleChangeBranch = () => {
        setBranch(selectedBranch);
        localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
        navigate(redirect ? redirect : '/', { replace: true });
    };

    return (
        <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: 'calc(100vh - 68px)' }}>
            <Grid item sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
                <AuthCardWrapper>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item>
                            <img style={{ height: 35, maxWidth: 70 }} src={logo} loading="lazy" />
                            <Typography textAlign="start" color="primary" variant="h3" mb={0.5}>
                                Select branch
                            </Typography>
                            <Typography variant="caption" fontSize="16px" textAlign={{ xs: 'center', md: 'inherit', mb: 2 }}>
                                For users who have multiple branches
                            </Typography>
                        </Grid>
                        {user?.branches.map((item) => (
                            <Grid item xs={12} key={item._id}>
                                <Button
                                    sx={{
                                        py: 1,
                                        borderRadius: 3,
                                        ...(selectedBranch === item && {
                                            borderColor: 'primary.main',
                                            color: 'primary.main',
                                            borderWidth: '2px !important',
                                            fontWeight: 'bold'
                                        })
                                    }}
                                    fullWidth
                                    size="large"
                                    onClick={() => setSelectedBranch(item)}
                                    variant="outlined"
                                >
                                    {item?.name}
                                </Button>
                            </Grid>
                        ))}
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    variant="contained"
                                    sx={{ py: 1.2, borderRadius: 3 }}
                                    disabled={!selectedBranch}
                                    onClick={handleChangeBranch}
                                >
                                    Change
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </AuthCardWrapper>
            </Grid>
            <FooterWatermark />
        </Grid>
    );
}
