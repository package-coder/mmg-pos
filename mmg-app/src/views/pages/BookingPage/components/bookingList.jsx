import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Stack,
    Chip,
    MenuItem,
    CircularProgress,
    TablePagination
} from '@mui/material';
import { useQuery } from 'react-query';
import { debounce, startCase } from 'lodash';
import CheckIcon from '@mui/icons-material/Check';

// Mock data
import booking from 'api/booking';
import moment from 'moment';

const BookingList = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data: bookings, isLoading } = useQuery('bookings', booking.GetAllBookings);

    const handleSearch = debounce((event) => {
        setSearchQuery(event.target.value);
    }, 300);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleConfirmBooking = (id) => {
        // Implement your booking confirmation logic here
        console.log(`Booking confirmed for ID: ${id}`);
    };

    const renderTableView = (children) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                mb={3}
            >
                {/* <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                    <TextField
                        select
                        size='small'
                        label="Member Type"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="all">
                            <em>All</em>
                        </MenuItem>
                        {
                            customers && Object.keys(Object.groupBy(customers, ({ customerType }) => customerType))
                                .filter(key => !key || key != 'undefined')
                                .map(customerType => <MenuItem value={customerType}>{startCase(customerType)}</MenuItem>)
                        }
                    </TextField>
                    <TextField label="Search" variant="outlined" onChange={handleSearch} size="small" />
                </Stack> */}
                {/* <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleNewCustomer}
                    >
                        New Customer
                    </Button>
                </Stack> */}
            </Stack>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Mobile Number</TableCell>
                            <TableCell>Referral</TableCell>
                            <TableCell>Schedule</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    {customer.firstName} {customer.middleName ? customer.middleName + ' ' : ''} {customer.lastName}
                                </TableCell>
                                <TableCell>{customer.emailAddress}</TableCell>
                                <TableCell>{customer.mobileNumber}</TableCell>
                                <TableCell>{customer.referral}</TableCell>
                                <TableCell>{customer.schedule}</TableCell>
                                <TableCell>
                                    <Button
                                        onClick={() => handleConfirmBooking(customer.id)}
                                        startIcon={<CheckIcon fontSize="small" />}
                                        variant="outlined"
                                        size="small"
                                    >
                                        Confirm Booking
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {children}
            </TableContainer>

            <div style={{ flex: '0 1 auto' }}>
                <TablePagination
                    component="div"
                    count={bookings?.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </div>
        </div>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (isLoading) {
        return renderTableView(renderMessage(<CircularProgress size={28} />));
    }

    if (!bookings || bookings.length === 0) {
        return renderTableView(
            renderMessage(
                <Typography color="lightgray" variant="h5">
                    No data available for this table
                </Typography>
            )
        );
    }

    // if (!filteredCustomers || filteredCustomers.length === 0) {
    //     return renderTableView(renderMessage(<Typography color='lightgray' variant='h5'>No available data to display. Try checking your filters</Typography>))
    // }

    return renderTableView();
};

export default BookingList;
