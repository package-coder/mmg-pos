// assets
import { IconPrinter, IconFlask } from '@tabler/icons-react';
import Role from 'utils/Role';
import { APP_ROLE } from 'api';

// constant
const icons = {
    IconPrinter,
    IconFlask
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const settings = {
    id: 'settings',
    title: 'Settings',
    type: 'group',
    roles: [Role.ADMIN],
    children: [
        {
            id: 'printersettings',
            title: 'Printer Settings',
            type: 'item',
            url: '/dashboard/printer-settings',
            icon: icons.IconPrinter,
            breadcrumbs: false
        },
        // Only meaningful on the admin/cloud instance — a branch already has POS/printing
        // fully available, so this toggle would do nothing there. See devTestMode.js.
        ...(APP_ROLE === 'admin'
            ? [
                  {
                      id: 'devtestmodesettings',
                      title: 'Dev Test Mode',
                      type: 'item',
                      url: '/dashboard/dev-test-mode-settings',
                      icon: icons.IconFlask,
                      breadcrumbs: false
                  }
              ]
            : [])
    ]
};

export default settings;
