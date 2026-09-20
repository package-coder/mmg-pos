import Box from '@mui/material/Box';
import { useDevTestMode } from 'utils/devTestMode';

// Fixed height so layouts that need to offset their own fixed AppBar/Sidebar around this
// banner (see MainLayout) have a single constant to add, instead of a magic number.
export const DEV_TEST_MODE_BANNER_HEIGHT = 32;

// Persistent, impossible-to-miss reminder that Dev Test Mode is on for this browser — on the
// admin/cloud instance that means POS routes and printing are open; on a branch it means
// terminal info (MIN/SN/PTU_NO) is mocked instead of coming from the real helper app. Renders
// nothing otherwise.
const DevTestModeBanner = () => {
    const devTestMode = useDevTestMode();
    if (!devTestMode) return null;

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
            DEV TEST MODE — terminal/PTU info is mocked and not from a real accredited terminal. This is not a real sale.
        </Box>
    );
};

export default DevTestModeBanner;
