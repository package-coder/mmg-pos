import React, { useState, useEffect, useContext, createContext } from 'react';
// material-ui
import { Container, CircularProgress, Typography, Box, CssBaseline, styled, useTheme, Stack, Card, Button } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import CardNoBg from 'ui-component/cards/CardNoBg';
import CashRegister from './components/CashRegister';
import PosComponent from './components/PosComponent';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import cashier_report from 'api/cashier_report';
import moment from 'moment';
import { useAuth } from 'providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import PageLoader from 'ui-component/PageLoader';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';
import PrinterProvider from 'providers/PrinterProvider';

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
    const { branch, user, loading: fetchingUser, } = useAuth();
    const { data, isLoading, refetch, isRefetching, } = useQuery(
        'cashier-report',
        () => cashier_report.GetAllCashierReport({ dateFilter: DateFilterEnum.TODAY, cashierId: user?._id }),
        {
            enabled: !fetchingUser && user != null,
        }
    );

    const report = data?.reports?.[0];
    const previousReport = data?.previousReports;

    // const { mutateAsync } = useMutation(cashier_report.TimeInCashierReport);

    const reportIsActive = report?.timeOut === null;
    const reportIsEmptyOrNotActive = !report;

    const getDrawerBalance = () => {
        const totalSales = report?.sales?.totalNetSales || 0
        const totalFund = report?.openingFund?.total || 0
        return Number(totalFund + totalSales)
    };

    if (!data || isLoading || fetchingUser) {
        return <PageLoader />;
    }

    return (
        <PrinterProvider>
            <CashierReportContext.Provider value={{ report, loading: isLoading, getDrawerBalance, isRefetching, refetch }}>
                {reportIsEmptyOrNotActive ? (
                    <CashRegister initialValues={previousReport?.endingCashOnHand?.count} />
                ) : reportIsActive ? (
                    <PosComponent />
                ) : (
                    <LogoutMessage report={report} />
                )}
            </CashierReportContext.Provider>
        </PrinterProvider>
    );
};

const LogoutMessage = ({ report }) => {
    const navigate = useNavigate();
    return (
        <Stack bgcolor="primary.light" alignItems="center" justifyContent="center" sx={{ p: 5, height: '100dvh' }}>
            <Card sx={{ p: 6, mb: 8, width: { lg: '80%', xl: '60%' }, maxWidth: 'xl' }}>
                <Typography variant="h1" fontSize={28} gutterBottom>
                    Your session for this day has ended.
                </Typography>

                <Typography variant="h3" mb={3} color="gray" fontWeight="regular" gutterBottom>
                    You have already logged out.
                </Typography>
                <Typography variant="h3" mb={3} color="gray" fontWeight="regular" gutterBottom>
                    Date: {report.date}
                    <br /> Time in: {moment(report?.timeIn).format('hh:mm a')}
                    <br /> Time out: {moment(report?.timeOut).format('hh:mm a')}
                </Typography>
                <Button onClick={() => navigate('/')} size="large" sx={{ bgcolor: 'grey.50' }}>
                    Go to Dashboard
                </Button>
            </Card>
        </Stack>
    );
};

export const useCashierReport = () => {
    return useContext(CashierReportContext);
};

export default PosPage;
