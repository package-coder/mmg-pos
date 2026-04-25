import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useQuery } from 'react-query';
import { Chip, Grid, InputAdornment } from '@mui/material';
import { omit, startCase } from 'lodash';
import { useField } from 'formik';
import branch from 'api/branch';
import { Stack } from '@mui/system';

export default function () {
    const [open, setOpen] = React.useState(false);
    const { data, refetch, isLoading } = useQuery('branch-selector', branch.GetAllBranch);

    const [{ value }, { error, touched }, { setValue }] = useField({
        name: 'branches',
        validate: (value) => {
            if (value?.length == 0) {
                return 'choose atleast one branch';
            }
        }
    });

    React.useEffect(() => {
        if (open) {
            refetch();
        }
    }, [open]);

    return (
        <Stack spacing={0.5}>
            <Autocomplete
                multiple
                filterSelectedOptions
                value={value || []}
                onChange={(e, newValue) => setValue(newValue)}
                disabled={isLoading && !data}
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                isOptionEqualToValue={(option, value) => value.id == option.id}
                getOptionLabel={(option) => startCase(option.name)}
                options={data || []}
                loading={isLoading}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        size="small"
                        placeholder="Search"
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon sx={{ color: 'gray', fontSize: 18 }} />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <React.Fragment>
                                    {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </React.Fragment>
                            )
                        }}
                        helperText={error}
                        error={Boolean(error && touched)}
                    />
                )}
            />
            <Grid container spacing={1}>
                {(value || [])?.map((item) => (
                    <Grid item xs="auto">
                        <Chip
                            variant="outlined"
                            label={item.name}
                            sx={{ color: 'grey.500' }}
                            onDelete={() => {
                                setValue(value.filter((i) => i._id != item._id));
                            }}
                        />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
}
