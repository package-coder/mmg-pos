import { Outlet } from 'react-router-dom';

// project imports
import Customization from '../Customization';
import FooterWatermark from 'ui-component/FooterWatermark';

// ==============================|| MINIMAL LAYOUT ||============================== //

const MinimalLayout = () => (
    <>
        <Outlet />
        <Customization />
    </>
);

export default MinimalLayout;
