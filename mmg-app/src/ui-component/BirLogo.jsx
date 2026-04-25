import { Box } from '@mui/material';
import logo from '../assets/images/bir-logo.png';

export default (props) => (
    <Box
        borderRadius="50%"
        bgcolor="white"
        overflow="hidden"
        width={165}
        height={165}
        display="flex"
        alignItems="center"
        justifyContent="center"
        {...props}
    >
        <img src={logo} style={{ height: props?.height ? props?.height - 15 : 110 }} />
    </Box>
);
