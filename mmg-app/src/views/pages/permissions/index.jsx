import React, { useState } from 'react';
import {
    Stack,
    TextField,
    IconButton,
    TableContainer,
    TableHead,
    TableRow,
    TableBody,
    TableCell,
    Table,
    TablePagination,
    Card
} from '@mui/material';
import Switch from 'ui-component/switch';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreatePermissionModal from './components/CreatePermissionModal';
import MainCard from 'ui-component/cards/MainCard';

// Define some sample permissions (replace with your actual permissions)
const permissions = [
    { name: 'Create Users', module: 'User Management' },
    { name: 'Edit Users', module: 'User Management' },
    { name: 'Delete Users', module: 'User Management' },
    { name: 'View User Data', module: 'User Management' },
    { name: 'Manage Roles', module: 'Authorization' },
    { name: 'Assign Permissions', module: 'Authorization' },
    { name: 'Create Content', module: 'Content Management' },
    { name: 'Edit Content', module: 'Content Management' },
    { name: 'Publish Content', module: 'Content Management' },
    { name: 'Delete Content', module: 'Content Management' },
    { name: 'Manage Categories', module: 'Content Management' },
    { name: 'View Analytics', module: 'Reports' },
    { name: 'Export Data', module: 'Data Management' },
    { name: 'Approve Comments', module: 'Content Moderation' },
    { name: 'Moderate Forum', module: 'Content Moderation' },
    { name: 'Access Settings', module: 'System Administration' }
    // Add more permission data as needed
];

function PermissionsPage() {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <MainCard title="Manage Permissions">
            <Stack mb={2} gap={1} direction="row" alignItems="center" justifyContent="space-between">
                <TextField size="small" label="Search..." />
                <CreatePermissionModal />
            </Stack>

            <Card sx={{ borderRadius: 2 }}>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={0} sx={{ textWrap: 'nowrap' }}>
                                    Permission Name
                                </TableCell>
                                <TableCell>Module</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {permissions?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((permission) => (
                                <TableRow key={permission.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell width={0} sx={{ textWrap: 'nowrap' }} component="th" scope="row">
                                        {permission.name}
                                    </TableCell>
                                    <TableCell>{permission.module}</TableCell>
                                    <TableCell>
                                        <Switch />
                                    </TableCell>
                                    <TableCell sx={{ pl: 0, py: 0 }}>
                                        <Stack direction="row" justifyContent="end">
                                            <IconButton size="small">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <div style={{ flex: '0 1 auto' }}>
                    <TablePagination
                        component="div"
                        count={permissions?.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </div>
            </Card>
        </MainCard>
    );
}

export default PermissionsPage;
