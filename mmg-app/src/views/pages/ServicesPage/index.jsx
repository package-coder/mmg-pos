import React from 'react';
// material-ui
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ProductList from './components/ServiceList';

// ==============================|| SAMPLE PAGE ||============================== //
const handleBack = () => {
    // Define your back action logic here
    console.log('Back button clicked!');
};

const ServicesPage = ({ mode }) => (
    <MainCard title="Lab Test">
        <ProductList mode={mode}></ProductList>
    </MainCard>
);

export default ServicesPage;
