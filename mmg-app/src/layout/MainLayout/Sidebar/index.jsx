import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar';
import { BrowserView, MobileView } from 'react-device-detect';

// project imports
import MenuCard from './MenuCard';
import MenuList from './MenuList';
import LogoSection from '../LogoSection';
import Chip from 'ui-component/extended/Chip';
import { useAuth } from 'providers/AuthProvider';

import { drawerWidth } from 'store/constant';

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window, topOffset = 0 }) => {
    const theme = useTheme();
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'));
    const { ptuNumber } = useAuth();

    const drawer = (
        <>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Box sx={{ display: 'flex', p: 2, mx: 'auto' }}>
                    <LogoSection />
                </Box>
            </Box>
            <BrowserView>
                <PerfectScrollbar
                    component="div"
                    style={{
                        height: !matchUpMd ? `calc(100vh - ${56 + topOffset}px)` : `calc(100vh - ${88 + topOffset}px)`,
                        paddingLeft: '16px',
                        paddingRight: '16px'
                    }}
                >
                    <MenuList />
                    {/* <MenuCard /> */}
                    <Stack direction="row" justifyContent="center" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
                        {ptuNumber && <Chip label={`PTU: ${ptuNumber}`} disabled chipcolor="primary" size="small" />}
                        <Chip
                            label={import.meta.env.VITE_APP_VERSION}
                            disabled
                            chipcolor="secondary"
                            size="small"
                            sx={{ cursor: 'pointer' }}
                        />
                    </Stack>
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <Box sx={{ px: 2 }}>
                    <MenuList />
                    <MenuCard />
                    <Stack direction="row" justifyContent="center" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
                        {ptuNumber && <Chip label={`PTU: ${ptuNumber}`} disabled chipcolor="primary" size="small" />}
                        <Chip
                            label={import.meta.env.VITE_APP_VERSION}
                            disabled
                            chipcolor="secondary"
                            size="small"
                            sx={{ cursor: 'pointer' }}
                        />
                    </Stack>
                </Box>
            </MobileView>
        </>
    );

    const container = window !== undefined ? () => window.document.body : undefined;

    return (
        <Box component="nav" sx={{ flexShrink: { md: 0 }, width: matchUpMd ? drawerWidth : 'auto' }} aria-label="mailbox folders">
            <Drawer
                container={container}
                variant={matchUpMd ? 'persistent' : 'temporary'}
                anchor="left"
                open={drawerOpen}
                onClose={drawerToggle}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        background: theme.palette.background.default,
                        color: theme.palette.text.primary,
                        borderRight: 'none',
                        [theme.breakpoints.up('md')]: {
                            top: `${88 + topOffset}px`
                        }
                    }
                }}
                ModalProps={{ keepMounted: true }}
                color="inherit"
            >
                {drawer}
            </Drawer>
        </Box>
    );
};

Sidebar.propTypes = {
    drawerOpen: PropTypes.bool,
    drawerToggle: PropTypes.func,
    window: PropTypes.object,
    topOffset: PropTypes.number
};

export default Sidebar;
