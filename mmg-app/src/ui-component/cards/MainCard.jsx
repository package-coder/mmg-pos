import PropTypes from 'prop-types';
import React from 'react';

// material-ui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// constant
const headerSX = {
    '& .MuiCardHeader-action': { mr: 0 },
    pb: 0
};

// ==============================|| CUSTOM MAIN CARD ||============================== //

const MainCard = React.forwardRef(
    (
        {
            border = false,
            boxShadow,
            children,
            content = true,
            contentClass = '',
            contentSX = {},
            darkTitle,
            secondary,
            shadow,
            sx = {},
            title,
            onBack, // New prop for back action
            ...others
        },
        ref
    ) => {
        return (
            <Card
                ref={ref}
                {...others}
                sx={{
                    border: border ? '1px solid' : 'none',
                    borderColor: 'divider',
                    ':hover': {
                        boxShadow: boxShadow ? shadow || '0 2px 14px 0 rgb(32 40 45 / 8%)' : 'inherit'
                    },
                    ...sx
                }}
            >
                {/* content & header divider */}
                {title && (
                    <>
                        {/* card header and action */}
                        <CardHeader
                            sx={headerSX}
                            title={
                                <React.Fragment>
                                    <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={2}>
                                        {onBack && ( // Render back button if onBack callback is provided
                                            <IconButton aria-label="back" onClick={onBack}>
                                                <ArrowBackIcon />
                                            </IconButton>
                                        )}
                                        {<Typography variant="h3">{title}</Typography>}
                                    </Stack>
                                </React.Fragment>
                            }
                            action={secondary}
                        />

                        {/* <Divider /> */}
                    </>
                )}

                {/* card content */}
                {content && (
                    <CardContent sx={contentSX} className={contentClass}>
                        {children}
                    </CardContent>
                )}
                {!content && children}
            </Card>
        );
    }
);

MainCard.propTypes = {
    border: PropTypes.bool,
    boxShadow: PropTypes.bool,
    children: PropTypes.node,
    content: PropTypes.bool,
    contentClass: PropTypes.string,
    contentSX: PropTypes.object,
    darkTitle: PropTypes.bool,
    secondary: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.object]),
    shadow: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sx: PropTypes.object,
    title: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.object]),
    onBack: PropTypes.func // Prop type for back action callback
};

export default MainCard;
