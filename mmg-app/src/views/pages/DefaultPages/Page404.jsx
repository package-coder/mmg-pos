import React from 'react';
import { useNavigate } from 'react-router-dom';
// material-ui
import { Box, Typography, Button } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import page_not_found from '../../../assets/images/page_not_found.svg';

// ==============================|| SAMPLE PAGE ||============================== //

const Page404 = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        // Define your back action logic here
        navigate('/dashboard');
    };

    return (
        <MainCard>
            <Box sx={{ maxWidth: 480, margin: 'auto', textAlign: 'center' }}>
                <Typography variant="h3" paragraph>
                    Sorry, page not found!
                </Typography>
                <Typography sx={{ color: 'text.secondary' }}>
                    Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL? Be sure to check your spelling.
                </Typography>

                <Box component="img" src={page_not_found} sx={{ height: 260, mx: 'auto', my: { xs: 5, sm: 10 } }} />

                <Button size="large" variant="contained" onClick={handleBack}>
                    Go to Home
                </Button>
            </Box>
        </MainCard>
    );
};

export default Page404;
