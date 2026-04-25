import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import ApexCharts from 'apexcharts';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

const status = [
    { value: 'today', label: 'Today' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
];

const TotalGrowthBarChart = ({ data: categories, branchOptions, onChangeBranch, branch }) => {
    const theme = useTheme();

    const { primary } = theme.palette.text;
    const divider = theme.palette.divider;
    const grey500 = theme.palette.grey[500];

    const primary200 = theme.palette.primary[200];
    const primaryDark = theme.palette.primary.dark;
    const secondaryMain = theme.palette.secondary.main;
    const secondaryLight = theme.palette.secondary.light;

    useEffect(() => {
        if (branchOptions.length > 0 && !branch) {
            onChangeBranch(branchOptions[0]._id);
        }
    }, [branchOptions]);

    // const selectedBranchData = branches.find((branch) => branch.id === selectedBranch) || { categories: [] };

    const categoryNames = categories.map(i => i.name)
    const cashData = categories.map(i => i.transactionSummary?.cash || 0)
    const chargeData = categories.map(i => i.transactionSummary?.charge || 0)

    const totalGrowth = categories.reduce((total, category) => total + category.totalNetSales, 0);

    const chartData = {
        options: {
            chart: {
                id: 'bar-chart'
            },
            xaxis: {
                categories: categoryNames
            },
            yaxis: {
                labels: {
                    formatter: (value) => `$${value.toFixed(2)}`
                }
            }
        }
    };

    const chartOptions = {
        ...chartData.options,
        colors: [primary200, primaryDark, secondaryMain, secondaryLight],
        xaxis: {
            categories: categoryNames,
            labels: {
                style: {
                    colors: Array(categoryNames.length).fill(primary)
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: [primary]
                }
            }
        },
        grid: { borderColor: divider },
        tooltip: { theme: 'light' },
        legend: { labels: { colors: grey500 } }
    };

    useEffect(() => {
        ApexCharts.exec('bar-chart', 'updateOptions', chartOptions);
    }, [chartOptions]);

    return (
        <MainCard>
            <Grid container>
                <Grid item xs={12}>
                    <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item>
                            <Grid container direction="column" spacing={1}>
                                <Grid item>
                                    <Typography variant="subtitle2">Total Growth</Typography>
                                </Grid>
                                <Grid item>
                                    <Typography variant="h3">Php {totalGrowth.toFixed(2)}</Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <TextField
                                select
                                value={branch}
                                onChange={(e) => onChangeBranch(e.target.value)}
                                fullWidth
                            >
                                {branchOptions.map((option) => (
                                    <MenuItem key={option._id} value={option._id}>
                                        {option.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={12} sx={{ '& .apexcharts-menu.apexcharts-menu-open': { bgcolor: 'background.paper' } }}>
                    <Chart
                        options={chartOptions}
                        series={[
                            { name: 'Cash', data: cashData },
                            { name: 'Charge', data: chargeData }
                        ]}
                        type="bar"
                        height={350}
                    />
                </Grid>
            </Grid>
        </MainCard>
    );
};

TotalGrowthBarChart.propTypes = {
    data: PropTypes.shape({
        data: PropTypes.arrayOf(
            PropTypes.shape({
                categories: PropTypes.arrayOf(
                    PropTypes.shape({
                        cash: PropTypes.number,
                        charge: PropTypes.number,
                        id: PropTypes.string,
                        name: PropTypes.string,
                        total: PropTypes.number
                    })
                ),
                id: PropTypes.string,
                name: PropTypes.string,
                total: PropTypes.number,
                totalCash: PropTypes.number,
                totalCharge: PropTypes.number
            })
        ).isRequired
    }).isRequired
};

export default TotalGrowthBarChart;
