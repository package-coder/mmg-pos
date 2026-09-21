import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';
import AuthorizeRoute from './components/AuthorizeRoute';
import Role from 'utils/Role';
import { APP_ROLE } from 'api';
import { useDevTestModeState } from 'utils/devTestMode';

const PosPage = Loadable(lazy(() => import('views/pages/PosPage')));
const PosXReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/XReport')));
const PosZReportPage = Loadable(lazy(() => import('views/pages/PosPage/pages/ZReport')));
const PosPageAr = Loadable(lazy(() => import('views/pages/PosPage/components/PosComponentAr')));
// const GenerateReportPage = Loadable(lazy(() => import('views/pages/generate-report')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

// Centralized/admin instance (VITE_ROLE=admin) never exposes POS/cashier routes,
// regardless of the logged-in user's role — except while Dev Test Mode is switched on
// (Settings > Dev Test Mode), a deliberately explicit, per-browser, runtime-only override
// (see utils/devTestMode.js). This is NOT meant to be left on: it exists so an admin can
// exercise POS routes for testing without permanently reopening a boundary that exists for
// real data-integrity reasons (invoice numbering, sync assumptions).
const PosGuard = () => {
    const { enabled: devTestMode, loaded } = useDevTestModeState();
    // Wait for the server value; acting on the not-yet-loaded default bounced admins to /404
    if (APP_ROLE === 'admin' && !loaded) return null;
    if (APP_ROLE === 'admin' && !devTestMode) return <Navigate to="/404" replace />;
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
