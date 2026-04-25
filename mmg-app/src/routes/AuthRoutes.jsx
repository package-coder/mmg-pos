import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import AuthLayout from 'views/pages/authentication/layout';
import UnauthorizeRoute from './components/UnauthorizeRoute';

const Login = Loadable(lazy(() => import('views/pages/authentication/Login')));
const FirstTimeLogin = Loadable(lazy(() => import('views/pages/authentication/FirstTimeLogin')));
const ChangePassword = Loadable(lazy(() => import('views/pages/authentication/ChangePassword')));
const ChangeBranch = Loadable(lazy(() => import('views/pages/authentication/ChangeBranch')));
const ForgotPassword = Loadable(lazy(() => import('views/pages/authentication/ForgotPassword')));

const AuthenticationRoutes = {
    path: '/auth',
    element: <AuthLayout />,
    children: [
        { path: 'change-branch', element: <ChangeBranch /> },
        {
            path: '',
            element: <UnauthorizeRoute />,
            children: [
                { path: 'login', element: <Login /> },
                { path: 'create-password', element: <FirstTimeLogin /> },
                { path: 'change-password', element: <ChangePassword /> },
                { path: 'forgot-password', element: <ForgotPassword /> }
            ]
        }
    ]
};

export default AuthenticationRoutes;
