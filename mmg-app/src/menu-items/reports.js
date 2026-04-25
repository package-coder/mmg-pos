// assets
import { IconUserFilled } from '@tabler/icons-react';
import Role from 'utils/Role';

import { FaFileInvoice } from 'react-icons/fa';
import { AiFillBank } from 'react-icons/ai';
import { IoMdPrint } from 'react-icons/io';
import { IoMdKeypad } from 'react-icons/io';

// constant
const icons = {
    IconUserFilled
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages = {
    id: 'reports',
    title: 'Reports',
    type: 'group',
    roles: [Role.ADMIN],
    children: [
        // {
        //     id: 'sales-deposit',
        //     title: 'Sales Deposits',
        //     type: 'item',
        //     url: '/dashboard/sales-deposits',
        //     icon: AiFillBank,
        //     breadcrumbs: false,
        //     roles: [Role.CASHIER]
        // },
        {
            id: 'cashier-reports',
            title: 'Cashier Reports',
            type: 'item',   
            url: '/dashboard/cashier-reports',
            icon: FaFileInvoice,
            breadcrumbs: false,
            roles: [Role.CASHIER]
        },
        {
            id: 'branch-reports',
            title: 'Branch Reports',
            type: 'item',
            url: '/dashboard/branch-reports',
            icon: FaFileInvoice,
            breadcrumbs: false,
            roles: [Role.ADMIN]
        },
        {
            id: 'bir-reports',
            title: 'BIR Reports',
            type: 'item',
            url: '/dashboard/discount-reports',
            icon: FaFileInvoice,
            breadcrumbs: false,
            roles: [Role.ADMIN]
        },
        {
            id: 'genReports',
            title: 'General Reports',
            type: 'item',
            url: '/dashboard/general-reports',
            icon: IoMdPrint,
            breadcrumbs: false
        },
        {
            id: 'auditLogs',
            title: 'Audit logs',
            type: 'item',
            url: '/dashboard/audit-logs',
            icon: IoMdKeypad,
            breadcrumbs: false
        },
    ]
};

export default pages;
