import { lazy } from 'react';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';
import AuthorizeRoute from './components/AuthorizeRoute';
import Role from 'utils/Role';

const PosPage = Loadable(lazy(() => import('views/pages/PosPage')));
const PosXReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/XReport')));
const PosZReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/ZReport')));
const PosPageAr = Loadable(lazy(() => import('views/pages/PosPage/components/PosComponentAr')));
// const GenerateReportPage = Loadable(lazy(() => import('views/pages/generate-report')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const PosRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '',
            element: <AuthorizeRoute roles={[Role.ADMIN, Role.CASHIER]} />,
            children: [
                {
                    path: '/pos',
                    children: [{ path: '', element: <PosPage /> }]
                },
                {
                    path: '/pos-ar',
                    element: <PosPageAr />
                },
                { path: '/pos/x-report', element: <PosXReportPage /> },
                { path: '/pos/z-report', element: <PosZReportPage /> }

                // { path: '/dashboard/branch-reports/create', element: <GenerateReportPage /> }
            ]
        }
    ]
};

export default PosRoutes;
