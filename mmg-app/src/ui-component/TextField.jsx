import { TextField } from '@mui/material';
import { useField } from 'formik';

export default function ({ helperText, required, ...props }) {
    const [field, meta, helper] = useField(props.name);
    const { error, touched } = meta;

    return (
        <TextField
            size="small"
            fullWidth={!props.disableFullWidth}
            error={Boolean(error || (!field.value && touched && required))}
            helperText={helperText && Boolean(error || (!field.value && touched && required)) ? error : null}
            {...props}
            {...field}
        />
    );
}
