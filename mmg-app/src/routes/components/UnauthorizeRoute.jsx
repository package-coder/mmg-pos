import { useAuth } from 'providers/AuthProvider';
import { Navigate, Outlet, useHref } from 'react-router-dom';

const UnauthorizeRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) return <Outlet />;

    return <Navigate to="/" replace />;
};

export default UnauthorizeRoute;
