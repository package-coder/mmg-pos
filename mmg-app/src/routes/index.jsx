import { createBrowserRouter } from 'react-router-dom';

// routes
import MainRoutes from './MainRoutes';
import LoginRoutes from './AuthRoutes';
import PosRoutes from './PosRoutes';
import RedictRoute from './components/RedirectRoute';
import AuthorizeRoute from './components/AuthorizeRoute';

const RootRoutes = {
    path: '/',
    element: <RedictRoute />
};

export function RequireAuth(children, roles) {
    return {
        path: '',
        element: <AuthorizeRoute roles={roles} />,
        children
    };
}

// ==============================|| ROUTING RENDER ||============================== //
const router = createBrowserRouter([RootRoutes, MainRoutes, PosRoutes, LoginRoutes], {
    basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
