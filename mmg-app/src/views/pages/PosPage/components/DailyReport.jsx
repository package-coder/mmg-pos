import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Typography,
    TablePagination,
    CircularProgress,
    Stack
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
import { useQuery } from 'react-query';
import { CSVLink } from 'react-csv';

// api
import transaction from 'api/transaction';

const beginningBalance = 1000;
const endingBalance = 2000;

const selectedBranchData = localStorage.getItem('selectedBranch');

// Parse the JSON string into an object
const branch = JSON.parse(selectedBranchData);

// Access the name property
const bhName = branch?.name;

const companyName = 'MEDICAL MISSION GROUP HOSPITAL HEALTH SERVICES COOP.- ALBAY';
const address = '4th Flr. MMGHHSC Medical Arts Bldg. 216 Ziga Ave. cor Ruivivar St., Tabaco City';
const teleFaxInfo = '(052) 830-01-38';
const telNoInfo = '(052) 487-58-77';
const reportTitle = 'Daily Sales Report';
const branchName = bhName;
const reportDate = new Date().toLocaleDateString();

// pdfMake.vfs = pdfFonts.pdfMake.vfs;

const DailyReport = ({ cashierId, branchId }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data, isLoading, isError, error } = useQuery(
        ['transaction', cashierId, branchId],
        () => transaction.GetSales(cashierId, branchId),
        {
            enabled: !!cashierId // Only run the query if a transaction ID is set
        }
    );

    console.log('dr:', data, cashierId, branchId);

    // const generatePDF = () => {
    //   const tableColumn = [
    //     'Customer Name',
    //     'Lab Exam Done',
    //     'OR',
    //     'Amount',
    //     'Packages',
    //     'Lab Services',
    //     'ECG Services',
    //     'XRAY Services',
    //     'UTZ Services',
    //     'Drug Test',
    //     'Send Out',
    //     'LAB Comm',
    //     'PF',
    //     'Discount',
    //     'Others',
    //     'Referee'
    //   ];
    //   const tableRows = [];

    //   data?.cols?.forEach((row) => {
    //     const rowData = [
    //       row.customerData?.name || '---',
    //       row.labExams,
    //       row.orNo,
    //       row.amount,
    //       row.categories.find((c) => c.name === 'Package')?.price || '---',
    //       row.categories.find((c) => c.name === 'Laboratory Services')?.price || '---',
    //       row.categories.find((c) => c.name === 'ECG Services')?.price || '---',
    //       row.categories.find((c) => c.name === 'X-RAY Services')?.price || '---',
    //       row.categories.find((c) => c.name === 'UTZ')?.price || '---',
    //       row.categories.find((c) => c.name === 'Drug Test')?.price || '---',
    //       row.categories.find((c) => c.name === 'Send Out')?.price || '---',
    //       row.categories.find((c) => c.name === 'LAB Comm')?.price || '---',
    //       row.categories.find((c) => c.name === 'PF')?.price || '---',
    //       row.discount || '---',
    //       row.categories.find((c) => c.name.startsWith('Others'))?.price || '---',
    //       row.referrer || '---'
    //     ];
    //     tableRows.push(rowData);
    //   });

    //   const documentDefinition = {
    //     pageOrientation: 'landscape', // Set the orientation to landscape
    //     content: [
    //       { text: companyName, style: 'header', alignment: 'center' },
    //       { text: reportTitle, style: 'subheader', alignment: 'center' },
    //       { text: `${branchName}`, style: 'details', alignment: 'center' },
    //       { text: `${reportDate}`, style: 'details', alignment: 'center' },
    //       {
    //         table: {
    //           headerRows: 1,
    //           widths: [
    //             '5%', '5%', '5%', '5%', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'
    //           ],
    //           body: [
    //             tableColumn,
    //             ...tableRows
    //           ]
    //         }
    //       }
    //     ],
    //     styles: {
    //       header: {
    //         fontSize: 20,
    //         bold: true,
    //         margin: [0, 8, 0, 0]
    //       },
    //       subheader: {
    //         fontSize: 16,
    //         bold: true,
    //         margin: [0, 8, 0, 0]
    //       },
    //       details: {
    //         fontSize: 12,
    //         margin: [0, 8, 0, 0]
    //       }
    //     }
    //   };

    //   pdfMake.createPdf(documentDefinition).download('daily_sales_report.pdf');
    // };

    const generateCSVData = () => {
        console.log('data?.cols', data?.cols);
        const csvData = data?.cols?.map((row) => ({
            customerName: row.customerData?.name || '---',
            labExams: row.labExams,
            orNo: row.orNo,
            amount: row.amount,
            package: row.categories.find((c) => c.name === 'Package')?.price || '---',
            labServices: row.categories.find((c) => c.name === 'Laboratory Services')?.price || '---',
            ecgServices: row.categories.find((c) => c.name === 'ECG Services')?.price || '---',
            xrayServices: row.categories.find((c) => c.name === 'X-RAY Services')?.price || '---',
            utzServices: row.categories.find((c) => c.name === 'UTZ')?.price || '---',
            drugTest: row.categories.find((c) => c.name === 'Drug Test')?.price || '---',
            sendOut: row.categories.find((c) => c.name === 'Send Out')?.price || '---',
            labComm: row.categories.find((c) => c.name === 'LAB Comm')?.price || '---',
            pf: row.categories.find((c) => c.name === 'PF')?.price || '---',
            discount: row.discount || '---',
            others: row.categories.find((c) => c.name.startsWith('Others'))?.price || '---',
            referrer: row.referrer || '---'
        }));

        return csvData;
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (isLoading) {
        return (
            <Stack direction="column" justifyContent="center" alignItems="center" spacing={2}>
                <CircularProgress />
            </Stack>
        );
    }

    if (isError) {
        return <Typography color="error">{error.message}</Typography>;
    }

    return (
        <Paper sx={{ padding: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={3}>
                <Typography variant="h3" gutterBottom mb={3}>
                    Daily Sales Report
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                    {/* <Button variant="contained" color="primary" startIcon={<PrintIcon />} sx={{ marginRight: 2 }}>
            Download PDF
          </Button> */}
                    <CSVLink
                        data={generateCSVData()}
                        headers={[
                            { label: 'Customer Name', key: 'customerName' },
                            { label: 'Lab Exam Done', key: 'labExams' },
                            { label: 'OR', key: 'orNo' },
                            { label: 'Amount', key: 'amount' },
                            { label: 'Packages', key: 'packages' },
                            { label: 'Lab Services', key: 'labServices' },
                            { label: 'ECG Services', key: 'ecgServices' },
                            { label: 'XRAY Services', key: 'xrayServices' },
                            { label: 'UTZ Services', key: 'utzServices' },
                            { label: 'Drug Test', key: 'drugTest' },
                            { label: 'Send Out', key: 'sendOut' },
                            { label: 'LAB Comm', key: 'labComm' },
                            { label: 'PF', key: 'pf' },
                            { label: 'Discount', key: 'discount' },
                            { label: 'Others', key: 'others' },
                            { label: 'Referee', key: 'referrer' }
                        ]}
                        filename="daily_sales_report.csv"
                        style={{ textDecoration: 'none' }}
                    >
                        <Button variant="outlined" color="primary" startIcon={<PrintIcon />}>
                            Download CSV
                        </Button>
                    </CSVLink>
                </Stack>
            </Stack>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Customer Name</TableCell>
                            <TableCell>Lab Exam Done</TableCell>
                            <TableCell>OR</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Packages</TableCell>
                            <TableCell>Lab Services</TableCell>
                            <TableCell>ECG Services</TableCell>
                            <TableCell>XRAY Services</TableCell>
                            <TableCell>UTZ Services</TableCell>
                            <TableCell>Drug Test</TableCell>
                            <TableCell>Send Out</TableCell>
                            <TableCell>LAB Comm</TableCell>
                            <TableCell>PF</TableCell>
                            <TableCell>Discount</TableCell>
                            <TableCell>Others</TableCell>
                            <TableCell>Referee</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data?.cols?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.customerData?.name || '---'}</TableCell>
                                <TableCell>{row.labExams}</TableCell>
                                <TableCell>{row.orNo}</TableCell>
                                <TableCell>{row.amount}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'Package')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'Laboratory Services')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'ECG Services')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'X-RAY Services')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'UTZ')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'Drug Test')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'Send Out')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'LAB Comm')?.price || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name === 'PF')?.price || '---'}</TableCell>
                                <TableCell>{row.discount || '---'}</TableCell>
                                <TableCell>{row.categories.find((c) => c.name.startsWith('Others'))?.price || '---'}</TableCell>
                                <TableCell>{row.referrer || '---'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={data?.cols?.length || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
};

export default DailyReport;
