import React, { useState, useMemo, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { Typography, Stack, Divider } from '@mui/material';
import { useQuery } from 'react-query';
import cashier_report from 'api/cashier_report';
import moment from 'moment';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';
import { useAuth } from 'providers/AuthProvider';

const NonAdminPage = ({ sessionItems }) => {

    const { user, branch, loading: fetchingUser } = useAuth();


    const { data, isLoading } = useQuery('cashier-report-dashboard', () =>
        cashier_report.GetAllCashierReport({ dateFilter: DateFilterEnum.TODAY, cashierId: user?._id }),
        {
            enabled: !fetchingUser && user != null
        }
    );

    const report = data?.reports?.[0];
    return (
        <MainCard title="Dashboard">
            <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={2}>
                <Stack direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={1}>
                    <Typography variant="h3">Welcome to {branch?.name}, {`${sessionItems?.firstName} ${sessionItems?.lastName}!`}</Typography>
                    {!isLoading && !report && (
                        <Typography variant="h4" mb={2} color="primary" gutterBottom>
                            You have not yet time in on POS.
                        </Typography>
                    )}
                    {!isLoading && report && (
                        <Typography variant="h3" mb={3} color="primary" gutterBottom>
                            {moment(report.date).format('dddd, MMMM DD YYYY')}
                            <br /> Time in: {moment(report?.timeIn).format('h:mm A')}
                            <br /> Time out: {report?.timeOut ? moment(report?.timeOut).format('h:mm A') : 'N/A'}
                        </Typography>
                    )}
                    <Divider />
                </Stack>
            </Stack>
        </MainCard>
    );
};

export default NonAdminPage;
