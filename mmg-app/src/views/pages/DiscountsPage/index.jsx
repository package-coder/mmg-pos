import React from 'react';
// material-ui
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import DiscountList from './components/DiscountList';

const DiscountsPage = () => (
    <MainCard title="Discounts">
        <DiscountList></DiscountList>
    </MainCard>
);

export default DiscountsPage;
