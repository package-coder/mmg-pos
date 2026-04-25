import React from 'react';
// material-ui

// project imports
import MainCard from 'ui-component/cards/MainCard';
import CustomerList from './components/CustomerList';

// ==============================|| SAMPLE PAGE ||============================== //
const handleBack = () => {
    // Define your back action logic here
    console.log('Back button clicked!');
};

const CustomerPage = () => (
    <MainCard title="Customers">
        <CustomerList></CustomerList>
    </MainCard>
);

export default CustomerPage;
