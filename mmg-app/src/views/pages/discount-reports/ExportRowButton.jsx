import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PropTypes from 'prop-types';

function ExportRowButton({ loading, disabled, onClick }) {
    return (
        <Tooltip title="Export this row">
            <span>
                <IconButton size="small" disabled={disabled || loading} onClick={onClick}>
                    {loading ? <CircularProgress size={18} /> : <FileDownloadOutlinedIcon fontSize="small" />}
                </IconButton>
            </span>
        </Tooltip>
    );
}

ExportRowButton.propTypes = { loading: PropTypes.bool, disabled: PropTypes.bool, onClick: PropTypes.func };

export default ExportRowButton;
