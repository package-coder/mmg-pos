import React, { useState, useEffect } from 'react';
import {
    Stack,
    TextField,
    Typography,
    TableContainer,
    TableHead,
    TableRow,
    TableBody,
    TableCell,
    Table,
    Paper,
    Card,
    CircularProgress,
    TablePagination,
    Collapse
} from '@mui/material';
import Switch from 'ui-component/switch';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreateRoleModal from './components/CreateRoleModal';
import MainCard from 'ui-component/cards/MainCard';
import user from 'api/user';
import { useQuery } from 'react-query';
import role from 'api/role';
import { startCase } from 'lodash';
import UpdateRoleModal from './components/UpdateRoleModal';

const roles = [];

// Define some sample permissions (replace with your actual permissions)
const permissions = [
    'create users',
    'edit users',
    'delete users',
    'view user data',
    'manage roles',
    'assign permissions',
    'create content',
    'edit content',
    'publish content',
    'delete content',
    'manage categories',
    'view analytics',
    'export data',
    'approve comments',
    'moderate forum',
    'access settings'
    // Add more permissions as needed
];

const roleNamePrefixes = ['Admin', 'Editor', 'Viewer', 'Developer', 'Manager'];
const roleNameSuffixes = ['Management', 'Operations', 'Content', 'Security', 'Analytics'];

for (let i = 0; i < 20; i++) {
    // Generate random role name
    const randomPrefixIndex = Math.floor(Math.random() * roleNamePrefixes.length);
    const randomSuffixIndex = Math.floor(Math.random() * roleNameSuffixes.length);
    const roleName = `${roleNamePrefixes[randomPrefixIndex]} ${roleNameSuffixes[randomSuffixIndex]}`;

    const rolePermissions = [];

    // Generate a random number of permissions between 2 and 10 (adjust as needed)
    const numPermissions = Math.floor(Math.random() * (10 - 2 + 1)) + 2;

    // Select a random subset of permissions
    for (let j = 0; j < numPermissions; j++) {
        const randomIndex = Math.floor(Math.random() * permissions.length);
        rolePermissions.push(permissions[randomIndex]);
    }

    roles.push({
        name: roleName,
        permissions: rolePermissions
    });
}

function RolesPage() {
    const { data: roles, isLoading, isRefetching } = useQuery('roles', role.GetAllRoles);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        // Set default expanded row to the ID of the first role if available
        if (roles?.length > 0) {
            setExpandedRow(roles[0]._id);
        }
    }, [roles]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRowClick = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const renderTable = (children) => (
        <MainCard title="Manage Roles">
            <Stack
                mb={2}
                gap={1}
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
            >
                <TextField variant="outlined" size="small" label="Search" />
                <CreateRoleModal />
            </Stack>
            <Card sx={{ borderRadius: 2 }}>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650, borderBottom: 1, borderColor: 'grey.100' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={0} sx={{ textWrap: 'nowrap' }}>
                                    Name
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell sx={{ pl: 0, py: 0 }}>
                                    <Stack alignItems="end">
                                        <CircularProgress sx={{ visibility: isRefetching ? 'visible' : 'hidden' }} size={24} />
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!isLoading &&
                                roles?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((role) => (
                                    <React.Fragment key={role._id}>
                                        <TableRow
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                            onClick={() => handleRowClick(role._id)}
                                        >
                                            <TableCell width={0} sx={{ textWrap: 'nowrap' }} component="th" scope="row">
                                                {startCase(role.name)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell sx={{ pl: 0, py: 0, width: 0 }}>
                                                <UpdateRoleModal
                                                    initialValues={{
                                                        ...role,
                                                        id: role._id
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ paddingBottom: 0, paddingTop: 0 }}>
                                                <Collapse in={expandedRow === role._id}>
                                                    <Table sx={{ minWidth: 650 }}>
                                                        <TableBody>
                                                            {role?.authorizations?.map((auth) => (
                                                                <TableRow key={auth.resource}>
                                                                    <TableCell>{startCase(auth.resource)}</TableCell>
                                                                    <TableCell colSpan={4}>
                                                                        {Object.entries(auth.permissions || {})
                                                                            .filter(([_, value]) => value)
                                                                            .map(([permission, _]) => startCase(permission))
                                                                            .join(', ')}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                        </TableBody>
                    </Table>
                    {children}
                </TableContainer>
                <div style={{ flex: '0 1 auto' }}>
                    <TablePagination
                        component="div"
                        count={roles?.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </div>
            </Card>
        </MainCard>
    );

    const renderMessage = (children) => (
        <Stack alignItems="center" my={4}>
            {children}
        </Stack>
    );

    if (isLoading) {
        return renderTable(renderMessage(<CircularProgress size={28} />));
    }

    if (!roles || roles.length === 0) {
        return renderTable(
            renderMessage(
                <Typography color="lightgray" variant="h5">
                    No data available for this table
                </Typography>
            )
        );
    }

    return renderTable();
}

export default RolesPage;
