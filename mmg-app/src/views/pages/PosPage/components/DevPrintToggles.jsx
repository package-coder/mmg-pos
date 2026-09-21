import { FormControlLabel, Stack, Switch } from '@mui/material';

// Dev Test Mode only: lets a test print behave like the real thing. `reprint` is what the
// print request will use; `twoCopies` (receipts only) prints customer's + company's copies
// like an actual sale instead of the single throwaway copy Dev Test Mode defaults to.
const DevPrintToggles = ({ reprint, onReprintChange, twoCopies, onTwoCopiesChange }) => (
    <Stack direction="row" alignItems="center" flexWrap="wrap">
        {onTwoCopiesChange && (
            <FormControlLabel
                control={<Switch size="small" checked={twoCopies} onChange={(e) => onTwoCopiesChange(e.target.checked)} />}
                label="2 copies (like actual)"
            />
        )}
        <FormControlLabel
            control={<Switch size="small" checked={!reprint} onChange={(e) => onReprintChange(!e.target.checked)} />}
            label="Proper print (not reprint)"
        />
    </Stack>
);

export default DevPrintToggles;
