import React, { useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Autocomplete, TextField, CircularProgress, Typography } from '@mui/material';
import { useQuery } from 'react-query';
import customer from 'api/customer';
import corporate from 'api/corporate';
import moment from 'moment';
import { customerType } from 'utils/mockData';

const CusCorSelect = ({ name, control, isNewTrans, label, onSelectedDataChange, customerData }) => {
    // Fetch customer and corporate data
    const { data: customers, isLoading: loadingCustomers, isError: errorCustomers } = useQuery('customers', customer.GetAllCustomers);
    const { data: corporates, isLoading: loadingCorporates, isError: errorCorporates } = useQuery('corporates', corporate.GetAllCorporate);
    const [selectedData, setSelectedData] = useState(customerData);

    // Combine and classify the data
    const combinedOptions = useMemo(() => {
        if (!customers || !corporates) return [];

        const sortedCustomers = customers.sort((a, b) => a.firstName.localeCompare(b.firstName));
        const sortedCorporates = corporates.sort((a, b) => a.name.localeCompare(b.name));

        return [
            {
                type: 'customer',
                label: 'Customers',
                options: sortedCustomers?.map((customer) => ({
                    id: customer._id,
                    name: `${customer.firstName} ${customer.middleName ? customer.middleName + ' ' : ''}${customer.lastName}`,
                    address: `${customer.address.street} ${customer.address.barangay} ${customer.address.cityMunicipality} ${customer.address.province} ${customer.address.country}`,
                    birthDate: moment(customer?.birthDate).format('L'),
                    age: customer.age,
                    tin: customer.tinNumber,
                    contactNumber: customer.contactNumber,
                    customerType: customer.customerType,
                    customerTypeId: customer?.customerTypeId,
                    type: 'customer'
                }))
            },
            {
                type: 'corporate',
                label: 'Corporates',
                options: sortedCorporates?.map((corporate) => ({
                    id: corporate?._id,
                    name: corporate?.name,
                    address: `${corporate?.streetAddress} ${corporate?.city} ${corporate?.state}`,
                    tin: corporate?.tinId,
                    contactNumber: corporate?.contactNumber,
                    customerType: 'corporate',
                    type: 'corporate'
                }))
            }
        ];
    }, [customers, corporates]);

    const handleChange = (e, value) => {
        if (value) {
            const { type, ...data } = value;
            const newData = {
                id: data.id,
                name: data.name,
                address: data.address,
                ...(type === 'customer' && {
                    age: data.age ? data.age : '---',
                    birthDate: data.birthDate ? data.birthDate : '---'
                }),
                contactNumber: data.contactNumber ? data.contactNumber : '---',
                customerType: data.customerType ? data.customerType : '---',
                customerTypeId: data?.customerTypeId,
                tin: data.tin ? data.tin : '---',
                type
            };
            setSelectedData(newData);
            if (onSelectedDataChange) {
                onSelectedDataChange(newData);
            }
        } else {
            setSelectedData(null);
            onSelectedDataChange(null);
        }
    };

    const handleValue = (fieldValue) => {
        return fieldValue || combinedOptions.flatMap((group) => group.options).find((item) => item?.id === selectedData?.id) || null;
    };

    if (loadingCustomers || loadingCorporates) return <CircularProgress />;
    if (errorCustomers || errorCorporates) return <Typography color="error">Failed to load data</Typography>;

    return (
        <Controller
            name={name}
            control={control}
            disabled={!isNewTrans}
            render={({ field }) => (
                <Autocomplete
                    {...field}
                    blurOnSelect
                    options={combinedOptions.flatMap((group) => group.options.map((option) => ({ ...option, type: group.type })))}
                    getOptionLabel={(option) => option.name}
                    groupBy={(option) => (option.type === 'customer' ? 'Customers' : 'Corporates')}
                    onChange={(e, value) => {
                        field.onChange(value); // Update react-hook-form
                        handleChange(e, value);
                    }}
                    value={handleValue(field.value)}
                    renderInput={(params) => <TextField {...params} label={label} variant="outlined" fullWidth />}
                />
            )}
        />
    );
};

export default CusCorSelect;
