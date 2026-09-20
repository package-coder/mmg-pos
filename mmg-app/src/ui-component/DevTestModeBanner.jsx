import Box from '@mui/material/Box';
import { APP_ROLE } from 'api';
import { useDevTestMode } from 'utils/devTestMode';

// Fixed height so layouts that need to offset their own fixed AppBar/Sidebar around this
// banner (see MainLayout) have a single constant to add, instead of a magic number.
export const DEV_TEST_MODE_BANNER_HEIGHT = 32;

// Persistent, impossible-to-miss reminder that POS routes and printing are only open here
// because Dev Test Mode is on for this browser — this is the admin/cloud instance, not a
// real branch, and none of what happens on it is a real sale. Renders nothing otherwise.
const DevTestModeBanner = () => {
    const devTestMode = useDevTestMode();
    if (APP_ROLE !== 'admin' || !devTestMode) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: DEV_TEST_MODE_BANNER_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#161616',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.4,
                zIndex: (theme) => theme.zIndex.drawer + 10
            }}
        >
            DEV TEST MODE — POS routes and printing are open for testing only. This is not real sale data.
        </Box>
    );
};

export default DevTestModeBanner;
