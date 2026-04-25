import PropTypes from 'prop-types';
import React from 'react';

// material-ui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// constant
const headerSX = {
    '& .MuiCardHeader-action': { mr: 0 }
};

// ==============================|| CUSTOM MAIN CARD ||============================== //

const CardNoBg = React.forwardRef(
    (
        {
            border = false,
            boxShadow,
            children,
            content = true,
            contentClass = '',
            contentSX = { flexGrow: 1 },
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
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'transparent',
                    ':hover': {
                        boxShadow: boxShadow ? shadow || '0 2px 14px 0 rgb(32 40 45 / 8%)' : 'inherit'
                    },
                    ...sx
                }}
            >
                {/* card header and action */}
                {/* <CardHeader
          sx={headerSX}
          title={
            <React.Fragment>
              {onBack && ( // Render back button if onBack callback is provided
                <IconButton aria-label="back" onClick={onBack}>
                  <ArrowBackIcon />
                </IconButton>
              )}
              {darkTitle ? (
                <Typography variant="h3">{title}</Typography>
              ) : (
                title
              )}
            </React.Fragment>
          }
          action={secondary}
        /> */}

                {/* content & header divider */}
                {title && <Divider />}

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

CardNoBg.propTypes = {
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

export default CardNoBg;
