import React from 'react';
// material-ui
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import PackageList from './components/PackagesList';

const PackagesPage = () => (
    <MainCard title="Packages">
        <PackageList></PackageList>
    </MainCard>
);

export default PackagesPage;
