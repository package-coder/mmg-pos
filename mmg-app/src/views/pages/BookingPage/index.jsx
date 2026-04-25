import React from 'react';
// material-ui

// project imports
import MainCard from 'ui-component/cards/MainCard';
import BookingList from './components/bookingList';

const BookingPage = () => (
    <MainCard title="Customers">
        <BookingList></BookingList>
    </MainCard>
);

export default BookingPage;
