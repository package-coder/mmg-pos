import { Divider, Stack, Typography } from '@mui/material';
import { dvoteDetails } from 'utils/mockData';
import { startCase } from 'lodash';

export default function () {
    return (
        <>
            <Divider sx={{ mb: 2 }} />
            <Stack alignItems="center" mb={0}>
                <Typography variant="h5" textAlign="center">
                    SUPPLIER
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500">
                    {startCase(dvoteDetails[0]?.name)}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500">
                    {startCase(dvoteDetails[0]?.address)}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500">
                    Vat Reg Tin: {dvoteDetails[0]?.tin}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500">
                    Accred. No: {dvoteDetails[0]?.accredNo}
                </Typography>
                <Typography variant="h5" fontWeight="regular" color="grey.500">
                    Date Issued: {dvoteDetails[0]?.accredDateIssued}
                </Typography>
                <Typography variant="h6">PTU No: {dvoteDetails[0]?.ptuNo}</Typography>
                <Typography variant="h6">Date Issued: {dvoteDetails[0]?.ptuDateIssued}</Typography>
            </Stack>
        </>
    );
}
