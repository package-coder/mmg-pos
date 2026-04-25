import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';

// project imports
import LogoSection from '../LogoSection';
import SearchSection from './SearchSection';
import NotificationSection from './NotificationSection';
import ProfileSection from './ProfileSection';

// assets
import { IconMenu2 } from '@tabler/icons-react';
import ConnectionSection from './ConnectionSection';
import { useQuery } from 'react-query';
import connection from 'api/connection';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const APP_ENV = import.meta.env.VITE_APP_ENV

const Header = ({ handleLeftDrawerToggle }) => {
    const theme = useTheme();

    const isInternalProduction = APP_ENV == 'internal-production'

    // const { data, isLoading } = useQuery('check-connection', connection.CheckConnection, { 
    //     refetchInterval: 4000, 
    //     refetchIntervalInBackground: true, 
    //     enabled: false  
    // })
   
    // const isConnected = data?.is_connected

    return (
        <>
            {/* logo & toggler button */}
            <Box
                sx={{
                    width: 228,
                    display: 'flex',
                    [theme.breakpoints.down('md')]: {
                        width: 'auto'
                    }
                }}
            >
                <Box component="span" sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, alignItems: 'center' }}>
                    <LogoSection />
                </Box>
                <ButtonBase sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <Avatar
                        variant="rounded"
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.primary.light,
                            color: theme.palette.primary.dark,
                            '&:hover': {
                                background: theme.palette.primary.dark,
                                color: theme.palette.primary.light
                            }
                        }}
                        onClick={handleLeftDrawerToggle}
                        color="primary"
                    >
                        <IconMenu2 stroke={1.5} size="1.3rem" />
                    </Avatar>
                </ButtonBase>
            </Box>

            {/* header search */}
            {/* <SearchSection /> */}
            <Box sx={{ flexGrow: 1 }} />
            {/* {isInternalProduction && <ConnectionSection isLoading={isLoading} isConnected={isConnected}/>} */}
            {/* notification & profile */}
            {/* <NotificationSection /> */}
            <ProfileSection />
        </>
    );
};

Header.propTypes = {
    handleLeftDrawerToggle: PropTypes.func
};

export default Header;
