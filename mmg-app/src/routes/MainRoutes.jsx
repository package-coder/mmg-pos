import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import { Navigate } from 'react-router-dom';
import AuthorizeRoute from './components/AuthorizeRoute';
import Role from 'utils/Role';
import { element } from 'prop-types';
import { APP_ROLE } from 'api';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard')));

// page routing
const ServicesPage = Loadable(lazy(() => import('views/pages/ServicesPage')));
const UsersPage = Loadable(lazy(() => import('views/pages/users')));
const RolesPage = Loadable(lazy(() => import('views/pages/roles')));
const PermissionsPage = Loadable(lazy(() => import('views/pages/permissions')));
const ServiceForm = Loadable(lazy(() => import('views/pages/ServicesPage/components/ServiceForm')));
const ServiceCategoriesPage = Loadable(lazy(() => import('views/pages/ServiceCategoriesPage')));
const DiscountsPage = Loadable(lazy(() => import('views/pages/DiscountsPage')));
const PackagesPage = Loadable(lazy(() => import('views/pages/PackagesPage')));
const PackageForm = Loadable(lazy(() => import('views/pages/PackagesPage/components/PackageForm')));
const BranchesPage = Loadable(lazy(() => import('views/pages/branches')));
const DoctorsPage = Loadable(lazy(() => import('views/pages/doctors')));
const TransactionsPage = Loadable(lazy(() => import('views/pages/transactions')));
const CorporatesPage = Loadable(lazy(() => import('views/pages/corporates')));
const SalesDepositsPage = Loadable(lazy(() => import('views/pages/sales-deposits')));
const BranchReportsPage = Loadable(lazy(() => import('views/pages/branch-reports')));
const CashierReportListPage = Loadable(lazy(() => import('views/pages/cashier-reports')));
const CashierReportPage = Loadable(lazy(() => import('views/pages/cashier-reports/pages/CashierReport')));
const DiscountReportPage = Loadable(lazy(() => import('views/pages/discount-reports/')));
const CustomerPage = Loadable(lazy(() => import('views/pages/CustomerPage')));
const CustomerForm = Loadable(lazy(() => import('views/pages/CustomerPage/components/CustomerForm')));
const PrinterSettings = Loadable(lazy(() => import('views/pages/Settings/PrinterSettings')));
const DevTestModeSettings = Loadable(lazy(() => import('views/pages/Settings/DevTestModeSettings')));
const GenReports = Loadable(lazy(() => import('views/pages/reports/GenReports')));
const BookingPage = Loadable(lazy(() => import('views/pages/BookingPage')));
const HomePage = Loadable(lazy(() => import('views/pages/HomePage')));
const AuditLogPage = Loadable(lazy(() => import('views/pages/audit-logs')));

export function RequireAuth(children, roles) {
    return {
        path: '',
        element: <AuthorizeRoute roles={roles} />,
        children
    };
}

// Downstream-synced master data (users, roles, branches, doctors, corporates,
// packages, discounts, labtest/services) is centrally owned by the admin
// instance (VITE_ROLE=admin). Branches only ever receive it via sync, so
// editing it locally would clobber on the next sync tick — but a branch
// ADMIN can still view it read-only for reference (e.g. checking a
// package's price or a discount's rule); CASHIER gets no access at all on
// branch, matching the write-side restriction. Create/edit routes
// (`writeOnly`) are never reachable on a branch deployment regardless of
// role — the page components also hide/disable their own Add/Edit
// buttons, this is the defense-in-depth layer against a typed URL.
const LookupRoute = ({ roles, writeOnly = false }) => {
    if (APP_ROLE === 'admin') return <AuthorizeRoute roles={roles} />;
    if (writeOnly) return <Navigate to="/404" replace />;
    return <AuthorizeRoute roles={[Role.ADMIN]} />;
};

export function RequireLookupView(children, roles) {
    return {
        path: '',
        element: <LookupRoute roles={roles} />,
        children
    };
}

export function RequireLookupWrite(children, roles) {
    return {
        path: '',
        element: <LookupRoute roles={roles} writeOnly />,
        children
    };
}

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: 'dashboard',
            children: [
                RequireAuth([{ path: 'transactions', element: <TransactionsPage /> }], [Role.CASHIER, Role.ADMIN]),
                RequireAuth(
                    [
                        { path: '' },
                        { path: 'home', element: <HomePage /> },
                        { path: 'bookings', element: <BookingPage /> },
                        { path: 'audit-logs', element: <AuditLogPage /> },
                        { path: 'printer-settings', element: <PrinterSettings /> },
                        { path: 'dev-test-mode-settings', element: <DevTestModeSettings /> },
                        // { path: 'sales-deposits', element: <SalesDepositsPage /> },
                        {
                            path: 'cashier-reports',
                            children: [
                                { path: '', element: <CashierReportListPage /> },
                                { path: ':id', element: <CashierReportPage /> }
                            ]
                        },
                        {
                            path: 'discount-reports',
                            children: [
                                { path: '', element: <DiscountReportPage /> },
                            ]
                        },
                        {
                            path: 'branch-reports',
                            children: [
                                { path: '', element: <BranchReportsPage /> },
                                // { path: 'new', element: <GenerateReportPage /> }
                            ]
                        },
                        {
                            path: 'customers',
                            children: [
                                { path: '', element: <CustomerPage /> },
                                { path: 'new', element: <CustomerForm /> },
                                { path: 'edit', element: <CustomerForm /> }
                            ]
                        },
                        {
                            path: 'general-reports',
                            children: [{ path: '', element: <GenReports /> }]
                        }
                    ],
                    [Role.CASHIER, Role.ADMIN]
                ),
                // Centrally-managed master data — view is admin-deployment OR
                // branch-admin-read-only; create/edit is admin-deployment only
                // (see LookupRoute above).
                RequireLookupView(
                    [
                        { path: 'users', element: <UsersPage /> },
                        { path: 'roles', element: <RolesPage /> },
                        { path: 'branches', element: <BranchesPage /> },
                        { path: 'doctors', element: <DoctorsPage /> },
                        { path: 'corporates', element: <CorporatesPage /> },
                        {
                            path: 'labtest-categories',
                            children: [{ path: '', element: <ServiceCategoriesPage /> }]
                        },
                        {
                            path: 'discounts',
                            children: [{ path: '', element: <DiscountsPage /> }]
                        }
                    ],
                    [Role.CASHIER, Role.ADMIN]
                ),
                {
                    path: 'packages',
                    children: [
                        RequireLookupView([{ path: '', element: <PackagesPage /> }], [Role.CASHIER, Role.ADMIN]),
                        RequireLookupWrite(
                            [
                                { path: 'new', element: <PackageForm /> },
                                { path: 'edit', element: <PackageForm /> }
                            ],
                            [Role.CASHIER, Role.ADMIN]
                        )
                    ]
                },
                {
                    path: 'labtest',
                    children: [
                        RequireLookupView([{ path: '', element: <ServicesPage /> }], [Role.CASHIER, Role.ADMIN]),
                        RequireLookupWrite(
                            [
                                { path: 'new', element: <ServiceForm /> },
                                { path: 'edit', element: <ServiceForm /> }
                            ],
                            [Role.CASHIER, Role.ADMIN]
                        )
                    ]
                }
            ]
        }
    ]
};

export default MainRoutes;
