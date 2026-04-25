import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <Box bgcolor="grey.100" minHeight="100vh">
            <Outlet />
        </Box>
    );
}
