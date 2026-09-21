import React, { useState, useEffect, useContext, createContext } from 'react';
// material-ui
import { Container, CircularProgress, Box, CssBaseline, styled, useTheme } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import CardNoBg from 'ui-component/cards/CardNoBg';
import CashRegister from './components/CashRegister';
import PosComponent from './components/PosComponent';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import cashier_report from 'api/cashier_report';
import { useAuth } from 'providers/AuthProvider';
import PageLoader from 'ui-component/PageLoader';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'theme' })(({ theme, open }) => ({
    ...theme.typography.mainContent,
    marginTop: 0,
    minHeight: 'calc(100vh - 1px)',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create(
        'margin',
        open
            ? {
                  easing: theme.transitions.easing.easeOut,
                  duration: theme.transitions.duration.enteringScreen
              }
            : {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen
              }
    )
}));

// Mock API Functions
const mockApi = {
    getStatus: () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate the case where the beginning balance needs to be entered
                resolve({ needsInput: true });
            }, 1000);
        });
    }
};

// ==============================|| SAMPLE PAGE ||============================== //
const handleBack = () => {
    // Define your back action logic here
    console.log('Back button clicked!');
};

const CashierReportContext = createContext();

const PosPage = () => {
    const { branch, user, loading: fetchingUser } = useAuth();
    const { data, isLoading, refetch, isRefetching } = useQuery(
        'cashier-report',
        () => cashier_report.GetAllCashierReport({ dateFilter: DateFilterEnum.TODAY, cashierId: user?._id }),
        {
            enabled: !fetchingUser && user != null
        }
    );

    // Scoped to the currently selected branch — `data.reports` holds every cashier_reports
    // row for today across ALL branches (the /v2/cashier-reports query is cashierId+date
    // only, not branch-scoped). `.find()` without a fallback deliberately returns undefined
    // when this branch has no report yet today (a fresh branch, or one the cashier already
    // timed out of) — a cashier can time in, out, and back in again at the same branch the
    // same day (see unique_active_cashier_report_per_day, a partial index that only enforces
    // uniqueness among still-open shifts), so "no ACTIVE report for this branch" should always
    // lead to a fresh Opening Fund screen, never a dead-end "session ended" message.
    const report = data?.reports?.find((r) => r.branch?._id === branch?.id);
    const previousReport = data?.previousReports;

    // const { mutateAsync } = useMutation(cashier_report.TimeInCashierReport);

    const reportIsActive = report?.timeOut === null;

    const getDrawerBalance = () => {
        const totalSales = report?.sales?.totalNetSales || 0;
        const totalFund = report?.openingFund?.total || 0;
        return Number(totalFund + totalSales);
    };

    if (!data || isLoading || fetchingUser) {
        return <PageLoader />;
    }

    return (
        <CashierReportContext.Provider value={{ report, loading: isLoading, getDrawerBalance, isRefetching, refetch }}>
            {reportIsActive ? <PosComponent /> : <CashRegister initialValues={previousReport?.endingCashOnHand?.count} />}
        </CashierReportContext.Provider>
    );
};

export const useCashierReport = () => {
    return useContext(CashierReportContext);
};

export default PosPage;
