import { MenuItem, TextField } from '@mui/material';
import { uniq } from 'lodash';

export const DEFAULT_PTU_FILTER = 'all';
// Rows from before terminal scoping have no PTU.
export const NO_PTU = '-';

export const ptuOf = (row) => row?.ptuNumber || NO_PTU;
export const filterByPtu = (rows, filter) => (filter === DEFAULT_PTU_FILTER ? rows : (rows || []).filter((row) => ptuOf(row) === filter));

// Terminal (PTU) filter for the admin X/Z report lists. `values` are the rows already narrowed to
// the selected branch, so only that branch's terminals are offered.
// With `fixed` (a cashier's own terminal) the only choice is that PTU; pair it with `disabled`.
export default function PtuFilter({ filter, onChange, values, fixed, ...otherProps }) {
    const options = fixed ? [fixed] : uniq((values || []).map(ptuOf)).sort();

    return (
        <TextField
            select
            size="small"
            label="PTU No."
            value={filter}
            onChange={(e) => onChange(e?.target?.value)}
            sx={{ minWidth: 200 }}
            {...otherProps}
        >
            {!fixed && <MenuItem value={DEFAULT_PTU_FILTER}>All terminals</MenuItem>}
            {options.map((ptu) => (
                <MenuItem key={ptu} value={ptu}>
                    {ptu === NO_PTU ? 'No PTU (older records)' : ptu}
                </MenuItem>
            ))}
        </TextField>
    );
}
