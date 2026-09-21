import { useEffect } from 'react';
import { toUpper } from 'lodash';
import { useQuery } from 'react-query';
import { useAuth } from 'providers/AuthProvider';
import { Navigate, useHref } from 'react-router-dom';
import Role from 'utils/Role';
import cashier_report from 'api/cashier_report';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';
import PageLoader from 'ui-component/PageLoader';

const RedirectRoute = () => {
    const { user, branch, setBranch, loading } = useAuth();
    const ref = useHref();

    const isCashier = !!user && toUpper(user.role?.name) === Role.CASHIER;
    // Clearing `branch`/`selectedBranch` on time-out (CashRegister.jsx's handleConfirm) is
    // what makes branch selection reappear after a shift ends — this route only needs to
    // fill it back in when it's genuinely unknown (e.g. a device/browser that never had it),
    // by finding any branch this cashier is currently timed into. It must NOT re-derive or
    // second-guess an already-known branch: a cashier can time in, out, and back in again at
    // the SAME branch the same day (see unique_active_cashier_report_per_day), so a known
    // branch stays valid regardless of whether its most recent shift there has ended —
    // PosPage decides Opening Fund vs. the live POS screen from that, not this route.
    const { data, isLoading: shiftLoading } = useQuery(
        ['cashier-active-shift', user?._id],
        () => cashier_report.GetAllCashierReport({ dateFilter: DateFilterEnum.TODAY, cashierId: user._id }),
        { enabled: isCashier && !branch }
    );

    const anyActiveReport = data?.reports?.find((r) => r.timeOut === null);
    const effectiveBranch = branch || (anyActiveReport ? { ...anyActiveReport.branch, id: anyActiveReport.branch._id } : null);

    useEffect(() => {
        if (!isCashier || branch || shiftLoading || !anyActiveReport) return;

        setBranch(effectiveBranch);
        localStorage.setItem('selectedBranch', JSON.stringify(effectiveBranch));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCashier, branch, shiftLoading, anyActiveReport, effectiveBranch]);

    if (loading || (isCashier && !branch && shiftLoading)) return <PageLoader />;

    if (!user) {
        return <Navigate to={`/auth/login/${ref === '/' ? '' : `?redirect=${ref.replace('/', '')}`}`} replace />;
    }

    if (isCashier && !effectiveBranch) {
        return <Navigate to="/auth/change-branch" replace />;
    }

    return <Navigate to="/dashboard/home" replace />;
};

export default RedirectRoute;
