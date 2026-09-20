import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { APP_ROLE } from 'api';
import { useDevTestMode, setDevTestMode } from 'utils/devTestMode';

// What this toggle controls differs by deployment role — see utils/devTestMode.js,
// PosRoutes.jsx and PrinterProvider.jsx.
const DevTestModeSettings = () => {
    const devTestMode = useDevTestMode();
    const isAdmin = APP_ROLE === 'admin';

    return (
        <MainCard title="Dev Test Mode">
            <Stack spacing={3}>
                <Alert severity="warning">
                    {isAdmin
                        ? "This admin/cloud instance never handles real sales — invoice numbering and sync assumptions depend on it staying that way."
                        : 'This is a live branch deployment. Turning this on makes completed sales use a mocked terminal instead of a real accredited one — not just a local dev convenience.'}{' '}
                    This toggle is a temporary, per-browser override; turn it back off once you&apos;re done testing.
                </Alert>
                <FormControlLabel
                    control={<Switch checked={devTestMode} onChange={(e) => setDevTestMode(e.target.checked)} />}
                    label={
                        <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Enable Dev Test Mode
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {isAdmin
                                    ? 'When on: re-opens the POS, POS-AR, X-Report and Z-Report routes and re-enables print actions on this instance, for this browser only. When off (default): POS routes 404 and printing is blocked, as on every other admin/cloud deployment.'
                                    : "When on: checkout uses a mocked terminal (MIN/SN/PTU_NO) instead of querying the real helper app, for this browser only — useful with no printer/VFD hardware attached. When off (default): checkout always queries the real helper app, and is blocked if it can't be reached."}{' '}
                                A dark status bar appears on every page as a reminder while it's on.
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
