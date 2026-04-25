import { toUpper } from 'lodash';
import { useAuth } from 'providers/AuthProvider';
import { Navigate, Outlet, useHref } from 'react-router-dom';

const AuthorizeRoute = ({ roles }) => {
    const { user, loading } = useAuth();
    const ref = useHref();

    if (loading) return null;

    if (!user) return <Navigate to="/auth/login" replace state={{ redirect: ref == '/' ? null : `${ref}` }} />;

    if (roles && !roles?.includes(toUpper(user.role?.name)))
        //should be navigate to 404
        return <Navigate to="/404" replace />;

    return <Outlet />;
};

export default AuthorizeRoute;
