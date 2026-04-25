import PropTypes from 'prop-types';
import React, { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { useQuery } from 'react-query';

//api
import report from 'api/report';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonEarningCard from 'ui-component/cards/Skeleton/EarningCard';

// assets
import EarningIcon from 'assets/images/icons/earning.svg';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import GetAppTwoToneIcon from '@mui/icons-material/GetAppOutlined';
import FileCopyTwoToneIcon from '@mui/icons-material/FileCopyOutlined';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveOutlined';

import moment from 'moment';

// ===========================|| DASHBOARD DEFAULT - EARNING CARD ||=========================== //

const EarningCard = ({ branch }) => {
    const theme = useTheme();

    return (
        <MainCard
            border={false}
            content={false}
            sx={{
                bgcolor: 'secondary.dark',
                color: '#fff',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Box sx={{ p: 2.25 }}>
                <Grid container direction="column">
                    <Grid item sx={{ mb: 2 }}>
                        <Grid container direction="column" justifyContent="space-between" alignItems="flex-start" gap={2}>
                            <Grid item>
                                <Grid container alignItems="center">
                                    <Grid item>
                                        <Avatar
                                            variant="rounded"
                                            sx={{
                                                ...theme.typography.commonAvatar,
                                                ...theme.typography.largeAvatar,
                                                bgcolor: 'secondary.800',
                                                mt: 1
                                            }}
                                        >
                                            <img src={EarningIcon} alt="Notification" />
                                        </Avatar>
                                    </Grid>
                                    <Grid item>
                                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 500, ml: 1 }}>
                                            {branch?.name}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item>
                                <Grid container alignItems="center">
                                    <Grid item>
                                        <Typography sx={{ fontSize: '1.8rem', fontWeight: 500, mr: 1 }}>
                                            Php {(branch?.report?.totalNetSales || 0)?.toFixed(2)}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Typography
                            sx={{
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: 'secondary'
                            }}
                        >
                            Total Cash: Php {(branch?.totalCash || 0)?.toFixed(2)}
                        </Typography>
                        {/* <Typography
                            sx={{
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: 'secondary'
                            }}
                        >
                            Total AR: Php {branch.totalAr.toFixed(2)}
                        </Typography> */}
                    </Grid>
                </Grid>
            </Box>
        </MainCard>
    );
};


export default EarningCard;
