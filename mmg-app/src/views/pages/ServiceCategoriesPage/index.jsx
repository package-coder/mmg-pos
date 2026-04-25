import React from 'react';
// material-ui
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ServiceCategoryList from './components/ServiceCategoryList';

// ==============================|| SAMPLE PAGE ||============================== //
const handleBack = () => {
    // Define your back action logic here
    console.log('Back button clicked!');
};

const ServiceCategoriesPage = () => (
    <MainCard title="Lab Test Categories">
        <ServiceCategoryList></ServiceCategoryList>
    </MainCard>
);

export default ServiceCategoriesPage;
