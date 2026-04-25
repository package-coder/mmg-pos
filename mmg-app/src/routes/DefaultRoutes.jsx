import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

const Page404 = Loadable(lazy(() => import('views/pages/DefaultPages/Page404')));

const DefaultRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/404',
            element: <Page404 />
        }
    ]
};

export default DefaultRoutes;
