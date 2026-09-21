import { toUpper } from 'lodash';
import { useAuth } from 'providers/AuthProvider';
import { Navigate, useHref } from 'react-router-dom';
import Role from 'utils/Role';

const RedirectRoute = () => {
    const { user, branch, loading } = useAuth();
    const ref = useHref();

    const matchRole = (role) => toUpper(user.role?.name) === role;

    if (loading) return null;

    if (!user) {
        return <Navigate to={`/auth/login/${ref === '/' ? '' : `?redirect=${ref.replace('/', '')}`}`} replace />;
    }

    if (matchRole(Role.CASHIER) && !branch) {
        return <Navigate to="/auth/change-branch" replace />;
    }

    return <Navigate to="/dashboard/home" replace />;
};

export default RedirectRoute;
