import * as React from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from 'react-query';
import service from 'api/service';
import Switch from 'ui-component/switch';
import { APP_ROLE } from 'api';

export default function ProductSwitch({ id, value }) {
    const queryClient = useQueryClient();
    const [checked, setChecked] = React.useState(Boolean(value));

    React.useEffect(() => {
        setChecked(value);
    }, [value]);

    const { mutateAsync } = useMutation(service.EditService);

    const handleChange = (event) => {
        const value = event.target.checked;
        setChecked(value);
        mutateAsync({ id, isActive: value })
            .then(() => queryClient.invalidateQueries('services'))
            .catch(() => setChecked(!value));
    };

    return <Switch checked={checked} onChange={handleChange} disabled={APP_ROLE !== 'admin'} />;
}

ProductSwitch.propTypes = {
    id: PropTypes.string,
    value: PropTypes.bool
};
