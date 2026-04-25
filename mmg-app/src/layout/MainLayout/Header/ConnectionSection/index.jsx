import { Chip } from "@mui/material";
import { useTheme } from "@emotion/react";
import { green, red } from "@mui/material/colors";
import BlockIcon from '@mui/icons-material/Block';
import CircleIcon from '@mui/icons-material/Circle';

export default function ({ isConnected }) {
    const theme = useTheme()

    if(!isConnected) {
        return (
            <Chip 
                icon={<BlockIcon color='error' />}
                label='Offline'
                sx={{
                    mr: 1.5, 
                    py: 2.3, 
                    borderRadius: '27px',
                    backgroundColor: red[50],
                    '& .MuiChip-label': {
                        fontSize: '0.95rem',
                        color: theme.palette.error.main,
                    }
                }}
            />
        )
    }

    return (
        <Chip 
            icon={<CircleIcon  color='success' />}
            label='Online'
            sx={{
                mr: 1.5, 
                py: 2.3, 
                borderRadius: '27px',
                backgroundColor: green[50],
                '& .MuiChip-label': {
                    fontSize: '0.95rem',
                    color: theme.palette.success.main,
                }
            }}
        />
    )
}