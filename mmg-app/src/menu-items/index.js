import dashboard from './dashboard';
import security from './security';
import posRoutes from './posRoutes';
import settings from './settings';
import reports from './reports';

// ==============================|| MENU ITEMS ||============================== //

const menuItems = {
    items: [posRoutes, dashboard, reports, security, settings]
};

export default menuItems;
