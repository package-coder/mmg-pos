import { useState, useRef, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third-party

// project imports
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';

// assets
import { IconLogout } from '@tabler/icons-react';
import { useAuth } from 'providers/AuthProvider';
import { startCase } from 'lodash';
import { TextField } from '@mui/material';

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = () => {
    const { user, branch, logoutUser } = useAuth();
    const theme = useTheme();
    const customization = useSelector((state) => state.customization);
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    /**
     * anchorRef is used on different componets and specifying one type leads to other components throwing an error
     * */
    const anchorRef = useRef(null);
    const handleLogout = async () => {
        logoutUser().then(() => navigate('/auth/login', { replace: true }));
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }
        setOpen(false);
    };

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const prevOpen = useRef(open);
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus();
        }

        prevOpen.current = open;
    }, [open]);

    return (
        <>
            <Chip
                sx={{
                    alignItems: 'center',
                    borderRadius: '27px',
                    py: 2.3,
                    transition: 'all .2s ease-in-out',
                    borderColor: theme.palette.primary.light,
                    backgroundColor: theme.palette.primary.light,
                    '&[aria-controls="menu-list-grow"], &:hover': {
                        borderColor: theme.palette.primary.main,
                        background: `${theme.palette.primary.main}!important`,
                        color: theme.palette.primary.light,
                        '& svg': {
                            stroke: theme.palette.primary.light
                        }
                    },
                    '& .MuiChip-label': {
                        fontWeight: 'bold',
                        fontSize: '0.95rem'
                    }
                }}
                icon={
                    <Avatar
                        sx={{
                            ...theme.typography.mediumAvatar,
                            margin: '8px -2px 8px 4px !important',
                            cursor: 'pointer',
                            width: 30,
                            height: 30
                        }}
                        ref={anchorRef}
                        aria-controls={open ? 'menu-list-grow' : undefined}
                        aria-haspopup="true"
                        color="inherit"
                    />
                }
                label={`${startCase(user?.firstName)} ${startCase(user?.lastName)}`}
                variant="outlined"
                ref={anchorRef}
                aria-controls={open ? 'menu-list-grow' : undefined}
                aria-haspopup="true"
                onClick={handleToggle}
                color="primary"
            />
            <Popper
                placement="bottom-end"
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 14]
                            }
                        }
                    ]
                }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    <Box sx={{ p: 2, pb: 0 }}>
                                        <Stack>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="h4">
                                                    Hello, {startCase(user?.firstName)} {startCase(user?.lastName)}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="h5">{startCase(user?.role?.name)}</Typography>
                                        </Stack>
                                        <Box sx={{ px: 0.5, my: 2 }}>
                                            <TextField
                                                disabled
                                                value={startCase(branch?.name)}
                                                variant="outlined"
                                                label="Branch"
                                                fullWidth
                                            />
                                        </Box>
                                        <Divider />
                                    </Box>
                                    <Box sx={{ p: 2, pt: 0 }}>
                                        <List
                                            component="nav"
                                            sx={{
                                                width: '100%',
                                                maxWidth: 350,
                                                minWidth: 300,
                                                backgroundColor: theme.palette.background.paper,
                                                borderRadius: '10px',
                                                [theme.breakpoints.down('md')]: {
                                                    minWidth: '100%'
                                                },
                                                '& .MuiListItemButton-root': {
                                                    mt: 0.5
                                                }
                                            }}
                                        >
                                            <ListItemButton sx={{ borderRadius: `${customization.borderRadius}px` }} onClick={handleLogout}>
                                                <ListItemIcon>
                                                    <IconLogout stroke={1.5} size="1.3rem" />
                                                </ListItemIcon>
                                                <ListItemText primary={<Typography variant="body2">Logout</Typography>} />
                                            </ListItemButton>
                                        </List>
                                    </Box>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </>
    );
};

export default ProfileSection;
