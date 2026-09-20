import { Navigate } from 'react-router-dom';
import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { APP_ROLE } from 'api';
import { useDevTestMode, setDevTestMode } from 'utils/devTestMode';

// Admin/cloud-only page (see PosRoutes.jsx / PrinterProvider.jsx for what this toggle
// controls). Meaningless on a branch deployment — POS and printing are already fully
// available there — so the route 404s instead of showing a switch that does nothing.
const DevTestModeSettings = () => {
    const devTestMode = useDevTestMode();
    if (APP_ROLE !== 'admin') return <Navigate to="/404" replace />;

    return (
        <MainCard title="Dev Test Mode">
            <Stack spacing={3}>
                <Alert severity="warning">
                    This admin/cloud instance never handles real sales — invoice numbering and sync
                    assumptions depend on it staying that way. This toggle is a temporary, per-browser
                    override for exercising POS flows here; turn it back off once you&apos;re done testing.
                </Alert>
                <FormControlLabel
                    control={<Switch checked={devTestMode} onChange={(e) => setDevTestMode(e.target.checked)} />}
                    label={
                        <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Enable Dev Test Mode
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                When on: re-opens the POS, POS-AR, X-Report and Z-Report routes and
                                re-enables print actions on this instance, for this browser only — a dark
                                status bar appears on every page as a reminder. When off (default): POS
                                routes 404 and printing is blocked, as on every other admin/cloud deployment.
                            </Typography>
                        </Stack>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                />
            </Stack>
        </MainCard>
    );
};

export default DevTestModeSettings;
