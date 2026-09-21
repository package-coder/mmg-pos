import { Button, CircularProgress } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PropTypes from 'prop-types';

function ExportRowButton({ loading, disabled, onClick }) {
    return (
        <Button
            variant="outlined"
            size="small"
            color="inherit"
            disabled={disabled || loading}
            onClick={onClick}
            startIcon={loading ? <CircularProgress size={14} /> : <DescriptionOutlinedIcon fontSize="small" />}
            sx={{ textWrap: 'nowrap' }}
        >
            {loading ? 'Exporting…' : 'Export'}
        </Button>
    );
}

ExportRowButton.propTypes = { loading: PropTypes.bool, disabled: PropTypes.bool, onClick: PropTypes.func };

export default ExportRowButton;
