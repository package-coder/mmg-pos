import * as React from 'react';
import { useMutation } from 'react-query';
import user from 'api/user';
import Switch from 'ui-component/switch';
import branch from 'api/branch';

export default function ({ id, value }) {
    const [checked, setChecked] = React.useState(Boolean(value));

    React.useEffect(() => {
        setChecked(value);
    }, [value]);

    const { mutateAsync } = useMutation(branch.UpdateBranch);

    const handleChange = (event) => {
        const value = event.target.checked;
        setChecked(value);
        mutateAsync({ id, isActive: value }).catch(() => setChecked(!value));
    };

    return <Switch checked={checked} onChange={handleChange} />;
}
