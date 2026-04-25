import { Box, Divider, Typography } from '@mui/material';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';
function Header({ report }) {
    return (
        <>
            <Box mb={2}>
                <Typography variant="h3" textAlign="center">
                    {report?.branch?.name}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500" textAlign="center">
                    {startCase(`${report?.branch?.streetAddress}, ${report?.branch?.city} ${report?.branch?.state}`)}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500" textAlign="center">
                    #: {report?.branch?.contactNumber}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500" textAlign="center">
                    TIN: {report?.branch?.tin}
                </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
        </>
    );
}

Header.propTypes = {
    report: PropTypes.object
};

export default Header;
