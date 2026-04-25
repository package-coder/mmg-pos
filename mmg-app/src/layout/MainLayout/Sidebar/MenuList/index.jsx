// material-ui
import { Typography } from '@mui/material';

// project imports
import NavGroup from './NavGroup';
import menuItem from 'menu-items';
import { useAuth } from 'providers/AuthProvider';
import { upperCase } from 'lodash';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { SET_MENU } from 'store/actions';

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = () => {
    const { user, loading } = useAuth();

    const dispatch = useDispatch();
    useEffect(() => {
        dispatch({ type: SET_MENU, opened: !!user });
    }, [user]);

    if (loading) {
        return null;
    }

    const navItems = menuItem.items
        .filter((item) => {
            if (item?.children?.some((item) => item?.roles?.includes(upperCase(user?.role?.name)))) return true;
            if (item.roles?.includes(upperCase(user?.role?.name))) return true;
            return false;
        })
        .map((item) => {
            switch (item.type) {
                case 'group':
                    return <NavGroup key={item.id} item={item} role={user?.role?.name} />;
                default:
                    return (
                        <Typography key={item.id} variant="h6" color="error" align="center">
                            Menu Items Error
                        </Typography>
                    );
            }
        });

    return <>{navItems}</>;
};

export default MenuList;
