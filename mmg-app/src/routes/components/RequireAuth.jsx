import { Route } from 'react-router-dom';
import AuthorizeRoute from './AuthorizeRoute';

export function RequireAuth(routes, roles) {
    return routes.map((route) => ({
        ...route,
        element: <AuthorizeRoute roles={roles} element={route.element} />,
        children: route.children ? RequireAuth(route.children, roles) : undefined
    }));
}
