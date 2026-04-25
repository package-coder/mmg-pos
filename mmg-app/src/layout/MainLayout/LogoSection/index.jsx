import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// material-ui
import ButtonBase from '@mui/material/ButtonBase';

// project imports
import config from 'config';
import Logo from 'ui-component/Logo';
import logo from '../../../assets/images/logo.jpg';
import { MENU_OPEN } from 'store/actions';
import { Stack, Typography } from '@mui/material';

// ==============================|| MAIN LOGO ||============================== //

const LogoSection = () => {
    const defaultId = useSelector((state) => state.customization.defaultId);
    const dispatch = useDispatch();
    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <img style={{ height: 27, maxWidth: 54 }} src={logo} loading="lazy" />
            <Typography variant="h3" color="primary.dark">
                MMG-POS
            </Typography>
        </Stack>
    );
};

export default LogoSection;
