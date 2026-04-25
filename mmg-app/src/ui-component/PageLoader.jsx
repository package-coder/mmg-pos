// material-ui
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import { Avatar } from '@mui/material';
import dvoteLogo from '../assets/images/dvote-logo.jpg';

import { makeStyles } from '@mui/styles';
import clsx from 'clsx';
import DvoteLogo from './DvoteLogo';

// ==============================|| LOADER ||============================== //

const useStyles = makeStyles((theme) => ({
    spinner: {
        animation: '$spin .75s linear infinite'
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
    }
}));

export default () => {
    const classes = useStyles();

    return (
        <Box
            sx={{
                width: '100%',
                height: '100dvh',
                bgcolor: 'primary.light',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <Box
                className={clsx(classes.spinner)}
                borderTop={4}
                borderRadius="50%"
                borderColor="grey.400"
                position="fixed"
                width={173}
                height={173}
            ></Box>

            <DvoteLogo position="fixed" />
        </Box>
    );
};
