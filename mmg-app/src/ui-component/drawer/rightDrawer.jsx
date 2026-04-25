import React from 'react';
import { Drawer, useMediaQuery, useTheme } from '@mui/material';

const RightDrawer = ({ open, setOpen, children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setOpen(open);
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={toggleDrawer(false)}
            PaperProps={{
                style: {
                    width: isMobile ? '90%' : '80%'
                }
            }}
        >
            <div style={{ padding: '16px' }}>{children}</div>
        </Drawer>
    );
};

export default RightDrawer;
