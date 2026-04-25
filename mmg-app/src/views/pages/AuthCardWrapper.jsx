import PropTypes from 'prop-types';

// material-ui
import Box from '@mui/material/Box';

// project import
import MainCard from 'ui-component/cards/MainCard';

// ==============================|| AUTHENTICATION CARD WRAPPER ||============================== //

const AuthCardWrapper = ({ children, ...other }) => (
    <MainCard
        sx={{
            maxWidth: { xs: '100%', sm: 475 },
            margin: { xs: 3, md: 3 },
            '& > *': {
                flexGrow: 1,
                flexBasis: '50%'
            }
        }}
        content={false}
        {...other}
    >
        <Box sx={{ p: { xs: 5 } }}>{children}</Box>
    </MainCard>
);

AuthCardWrapper.propTypes = {
    children: PropTypes.node
};

export default AuthCardWrapper;
