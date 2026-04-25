// assets
import { IconPrinter } from '@tabler/icons-react';
import Role from 'utils/Role';

// constant
const icons = {
    IconPrinter
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
        }
    ]
};

export default settings;
