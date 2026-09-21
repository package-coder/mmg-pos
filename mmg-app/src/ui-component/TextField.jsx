import { TextField } from '@mui/material';
import { useField } from 'formik';

export default function ({ helperText, required, onChange, ...props }) {
    const [field, meta, helper] = useField(props.name);
    const { error, touched } = meta;
    const hasError = Boolean(error || (!field.value && touched && required));

    return (
        <TextField
            size="small"
            fullWidth={!props.disableFullWidth}
            error={hasError}
            helperText={hasError ? error : typeof helperText === 'boolean' ? undefined : helperText}
            {...props}
            {...field}
            // An onChange prop overrides Formik's own handler entirely (e.g. to reformat the
            // value before it's stored) - the caller is responsible for updating the field via
            // `helper` (setValue/setTouched/etc). Left out, behavior is unchanged.
            onChange={onChange ? (e) => onChange(e, helper) : field.onChange}
        />
    );
}
