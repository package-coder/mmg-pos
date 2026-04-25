import moment from 'moment';
import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import MainCard from 'ui-component/cards/MainCard';
import Typography from '@mui/material/Typography';
import { Stack, Grid } from '@mui/material';
import branch from 'api/branch';
import report from 'api/report';
import EarningCard from 'views/dashboard/EarningCard';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TotalGrowthBarChart from 'views/dashboard/TotalGrowthBarChart';
import category from 'api/category';

const AdminPage = () => {
    const [selectedBranch, setSelectedBranch] = useState('')

    const date = moment()
    const format = 'YYYY-MM-DD'
    const params = {
        startDate: date.startOf('month').format(format),
        endDate: date.endOf('month').format(format),
    }

    // Query to fetch branches
    const { data: branches, isLoading: loadingBranches } = useQuery({
        queryKey: ['branches-reports'],
        queryFn: () => branch.GetAllBranchReports(params)
    });
    
    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['categories-reports', selectedBranch],
        queryFn: () => category.GetAllCategoryReports({ ...params, branchId: selectedBranch }),
        enabled: !loadingBranches
    });

    const renderLoading = () => (
        <Stack alignItems="center" my={4}>
            <CircularProgress size={28} />
        </Stack>
    )

    return (
        <MainCard title="Dashboard">
            <Grid container spacing={2} sx={{ padding: '24px' }}>
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        {loadingBranches ? (
                            <Grid item xs={12}>{ renderLoading()}</Grid>
                        )
                        : (
                            branches.map(branch => (
                                <Grid key={branch._id} item xs={12} md={6} lg={3}>
                                    <EarningCard branch={branch} />
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={12}>
                            {loadingBranches || loadingCategories || !categories?.length ? renderLoading() : (
                                <TotalGrowthBarChart 
                                    data={categories} 
                                    branchOptions={branches}
                                    branch={selectedBranch}
                                    onChangeBranch={value => setSelectedBranch(value)}
                                />
                            )}
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </MainCard>
    );
};

export default AdminPage;
