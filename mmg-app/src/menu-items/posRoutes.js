// assets
import { MdPointOfSale } from 'react-icons/md';
import Role from 'utils/Role';

// constant
const icons = { MdPointOfSale };

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const posRoutes = {
    id: 'pointofsale',
    title: 'Point of Sale',
    type: 'group',
    roles: [Role.CASHIER],
    children: [
        {
            id: 'pos',
            title: 'POS',
            type: 'item',
            icon: icons.MdPointOfSale,
            url: '/pos',
            breadcrumbs: false
        },
        // {
        //     id: 'posar',
        //     title: 'POS-AR',
        //     type: 'item',
        //     icon: icons.MdPointOfSale,
        //     url: '/pos-ar',
        //     breadcrumbs: false
        // }
    ]
};

export default posRoutes;
