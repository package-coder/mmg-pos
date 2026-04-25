// utils/fetchRoles.js
import role from 'api/role';

const fetchRoles = async () => {
    try {
        const { data } = await role.GetAllRoles(); // Replace with your actual API call
        return data.map((role) => ({
            ...role,
            permissions: role.authorizations.reduce((acc, auth) => {
                acc[auth.resource] = auth.permissions;
                return acc;
            }, {})
        }));
    } catch (error) {
        console.error('Error fetching roles:', error);
        return [];
    }
};

export default fetchRoles;
