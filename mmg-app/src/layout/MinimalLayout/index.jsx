import { Outlet } from 'react-router-dom';

// project imports
import Customization from '../Customization';
import FooterWatermark from 'ui-component/FooterWatermark';
import DevTestModeBanner from 'ui-component/DevTestModeBanner';

// ==============================|| MINIMAL LAYOUT ||============================== //

const MinimalLayout = () => (
    <>
        <DevTestModeBanner />
        <Outlet />
        <Customization />
    </>
);

export default MinimalLayout;
