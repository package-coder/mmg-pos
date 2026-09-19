import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';
import AuthorizeRoute from './components/AuthorizeRoute';
import Role from 'utils/Role';
import { APP_ROLE } from 'api';

const PosPage = Loadable(lazy(() => import('views/pages/PosPage')));
const PosXReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/XReport')));
const PosZReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/ZReport')));
const PosPageAr = Loadable(lazy(() => import('views/pages/PosPage/components/PosComponentAr')));
// const GenerateReportPage = Loadable(lazy(() => import('views/pages/generate-report')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

// Centralized/admin instance (VITE_ROLE=admin) never exposes POS/cashier routes,
// regardless of the logged-in user's role.
const PosGuard = () => {
    if (APP_ROLE === 'admin') return <Navigate to="/404" replace />;
    return <AuthorizeRoute roles={[Role.ADMIN, Role.CASHIER]} />;
};

const PosRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '',
            element: <PosGuard />,
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
