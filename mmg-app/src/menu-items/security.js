// assets
import { IconUserFilled } from '@tabler/icons-react';
import Role from 'utils/Role';

// constant
const icons = {
    IconUserFilled
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const security = {
    id: 'security',
    title: 'Security',
    type: 'group',
    roles: [Role.ADMIN],
    children: [
        {
            id: 'authentication',
            title: 'Authentication',
            type: 'collapse',
            icon: icons.IconUserFilled,

            children: [
                {
                    id: 'users',
                    title: 'User Accounts',
                    type: 'item',
                    url: '/dashboard/users',
                    breadcrumbs: false
                },
                {
                    id: 'roles',
                    title: 'Manage Roles',
                    type: 'item',
                    url: '/dashboard/roles',
                    breadcrumbs: false
                }
            ]
        }
    ]
};

export default security;
