import React, { useState, useMemo, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';

// components
import AdminPage from './components/adminPage';
import NonAdminPage from './components/nonAdminPage';

const HomePage = () => {
    const [sessionItems, setSessionItems] = useState([]);

    useEffect(() => {
        const dataSession = JSON.parse(localStorage.getItem('session'));
        console.log('dataSession', dataSession);
        if (dataSession) {
            setSessionItems(dataSession);
        }
    }, []);

    return (
        sessionItems?.role?.name === 'admin' ? <AdminPage /> : <NonAdminPage sessionItems={sessionItems} />
    );
};

export default HomePage;
