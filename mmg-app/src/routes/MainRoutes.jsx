import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthorizeRoute from './components/AuthorizeRoute';
import Role from 'utils/Role';
import { element } from 'prop-types';

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
                        { path: 'users', element: <UsersPage /> },
                        { path: 'roles', element: <RolesPage /> },
                        { path: 'home', element: <HomePage /> },
                        { path: 'branches', element: <BranchesPage /> },
                        { path: 'bookings', element: <BookingPage /> },
                        { path: 'doctors', element: <DoctorsPage /> },
                        { path: 'corporates', element: <CorporatesPage /> },
                        { path: 'audit-logs', element: <AuditLogPage /> },
                        { path: 'printer-settings', element: <PrinterSettings /> },
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
                            path: 'packages',
                            children: [
                                { path: '', element: <PackagesPage /> },
                                { path: 'new', element: <PackageForm /> },
                                { path: 'edit', element: <PackageForm /> }
                            ]
                        },
                        {
                            path: 'labtest',
                            children: [
                                { path: '', element: <ServicesPage /> },
                                { path: 'new', element: <ServiceForm /> },
                                { path: 'edit', element: <ServiceForm /> }
                            ]
                        },
                        {
                            path: 'labtest-categories',
                            children: [{ path: '', element: <ServiceCategoriesPage /> }]
                        },
                        {
                            path: 'discounts',
                            children: [{ path: '', element: <DiscountsPage /> }]
                        },
                        {
                            path: 'general-reports',
                            children: [{ path: '', element: <GenReports /> }]
                        }
                    ],
                    [Role.CASHIER, Role.ADMIN]
                )
            ]
        }
    ]
};

export default MainRoutes;
