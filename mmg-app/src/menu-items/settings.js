// assets
import { IconPrinter, IconFlask, IconCreditCard } from '@tabler/icons-react';
import Role from 'utils/Role';

// constant
const icons = {
    IconPrinter,
    IconFlask,
    IconCreditCard
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
        {
            id: 'paymentmethodsettings',
            title: 'Payment Methods',
            type: 'item',
            url: '/dashboard/payment-method-settings',
            icon: icons.IconCreditCard,
            breadcrumbs: false
        },
        // Shown on both deployment roles — what it controls differs by role, see
        // views/pages/Settings/DevTestModeSettings.jsx and utils/devTestMode.js.
        {
            id: 'devtestmodesettings',
            title: 'Dev Test Mode',
            type: 'item',
            url: '/dashboard/dev-test-mode-settings',
            icon: icons.IconFlask,
            breadcrumbs: false
        }
    ]
};

export default settings;
