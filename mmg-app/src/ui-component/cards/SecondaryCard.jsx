import { Box, IconButton, Stack, Typography } from '@mui/material';
import MainCard from './MainCard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PropTypes from 'prop-types';

function SecondaryCard({ title, children, onBack, boxStyle, contentStyle }) {
    return (
        <Box sx={[{ display: 'flex', flexDirection: 'column' }, boxStyle]}>
            <Stack mb={1.5} direction="row" alignItems="center" spacing={2}>
                <IconButton onClick={onBack}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h3">{title}</Typography>
            </Stack>

            <MainCard sx={{ flex: 1, ...contentStyle }}>{children}</MainCard>
        </Box>
    );
}

SecondaryCard.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node,
    onBack: PropTypes.func,
    boxStyle: PropTypes.object,
    contentStyle: PropTypes.object
};

export default SecondaryCard;
