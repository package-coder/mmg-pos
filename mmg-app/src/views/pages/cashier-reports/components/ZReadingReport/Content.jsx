import { Divider, Grid, Stack, Typography } from '@mui/material';
import moment from 'moment';
import Currency from 'ui-component/Currency';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';

function Content({ report, reprint }) {
    const cash = ['0.05', '0.5', '1', '5', '10', '20', '50', '100', '200', '500', '1000']

    const renderGridItem = (label, value, highlight = false, indent = false) => (
        <>
            <Grid item xs={7}>
                <Typography sx={{ marginLeft: indent ? 4 : 0 }} variant="h4" fontWeight="regular" color="grey.500">
                    {label}
                </Typography>
            </Grid>
            <Grid item xs={5} sx={{ textWrap: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Typography sx={highlight == true ? { color: 'primary.main' } : highlight} textAlign="end" variant="h4" textWrap="pretty">
                    {value}
                </Typography>
            </Grid>
        </>
    );
    const renderDivider = () => (
        <Grid my={1} item xs={12}>
            <Divider />
        </Grid>
    )
    const renderTitle = (label) => (
        <Grid  item xs={12}>
            <Typography align='center' variant="h4" fontWeight="regular" color="grey.500">
                {label}
            </Typography>
        </Grid>
    )
    const clip = (value) => {
        if(!value)
            value = 0
        return value.toFixed(2)
    }

    return (
        <Grid container rowSpacing={0.8} mb={2}>
            {/* {renderGridItem('Cashier Name: ', startCase(`${report.cashier?.first_name} ${report.cashier?.last_name}`))} */}
            {reprint && renderGridItem('Reprint: ', moment().format('YYYY-MM-DD hh:mmA'))}
            {renderGridItem('Report Date: ', moment(report.date).format('YYYY-MM-DD'))}
            {/* {renderGridItem(
                'Time In & Out: ',
                moment(report.timeIn).format('hh:mm a') + ' - ' + (report.timeOut ? moment(report.timeOut).format('hh:mm a') : 'N/A')
            )} */}
            {/* {renderGridItem('Openning Fund: ', report.beginningCashOnHand?.total || 0)} */}
            {/* {report.endingCashOnHand?.count && (
                <Grid item xs={12}>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="h4" fontWeight="regular" color="grey.500">
                            Cash Count:
                        </Typography>
                        <Stack alignItems="end">
                            {Object.entries(report.endingCashOnHand?.count).map(([key, value]) => (
                                <Typography key={key} sx={{ marginLeft: 4 }} variant="h4" fontWeight="regular" color="grey.500">
                                    {key} * {value}
                                </Typography>
                            ))}
                        </Stack>
                    </Stack>
                </Grid>
            )} */}
            
            {renderGridItem('Beg. Invoice #: ', String(report.invoiceStartNumber).padStart(6, '0'))}
            {renderGridItem('End. Invoice #: ', String(report.invoiceEndNumber).padStart(6, '0'))}
            {renderGridItem('Beg. Cancel #: ', String(report.cancelledNumber?.beginning || 0).padStart(6, '0'))}
            {renderGridItem('End. Cancel #: ', String(report.cancelledNumber?.ending || 0).padStart(6, '0'))}
            {renderGridItem('Beg. Refund #: ', String(report.refundedNumber?.beginning || 0).padStart(6, '0'))}
            {renderGridItem('End. Refund #: ', String(report.refundedNumber?.ending || 0).padStart(6, '0'))}
            {renderGridItem('Z-Counter #: ', 1)}
            {renderGridItem('Reset Counter: ', 0)}
            {/* {renderGridItem('Ending Cash On Hand: ', report.endingCashOnHandTotal || 0)} */}
            {renderDivider()}
            {renderGridItem('Previous Accumulated Sales:', clip(report.previousAccumulatedSales))}
            {renderGridItem('Sales for the Day:', clip(report.totalNetSales))}
            {renderGridItem('Present Accumulated Sales:', clip(report.presentAccumulatedSales))}
            {renderDivider()}
            {renderGridItem('Gross Sales: ', clip(report.totalSalesWithoutMemberDiscount))}
            {renderGridItem('Less Discount: ', clip(report.totalMemberDiscount))}
            {renderGridItem('Less Cancelled: ', clip(report.salesAdjustment.cancelled))}
            {renderGridItem('Less Refunded: ', clip(report.salesAdjustment.refunded))}
            {renderGridItem('Net Sales: ', clip(report.totalNetSales))}
            {renderDivider()}
            {renderTitle('DISCOUNT SUMMARY')}
            {renderGridItem('SC Discount', clip(report.discountSummary.senior_citizen))}
            {renderGridItem('PWD Discount', clip(report.discountSummary.pwd))}
            {renderGridItem('NAAC Discount', clip(report.discountSummary.naac))}
            {renderGridItem('Solo Parent Discount', clip(report.discountSummary.solo_parent))}
            {renderDivider()}
            {renderTitle('SALES ADJUSTMENT')}
            {renderGridItem('Cancel:', clip(report.salesAdjustment.cancelled))}
            {renderGridItem('Refund:', clip(report.salesAdjustment.refunded))}
            {renderDivider()}
            {renderTitle('CASH IN DRAWER COUNT')}
            {report.endingCashCount && (
                <>
                    {Object.keys(report.endingCashCount)
                        .filter(i => i.includes('M'))
                        .map(i => parseFloat(i.split('M')[1]?.replace('P', '.')))
                        .sort((a, b) => b - a)
                        .map((key) => {

                            const formattedKey = `M${key}`.replace('.', 'P')
                            const value = report.endingCashCount[formattedKey]
                  
                            return (
                                <>
                                    <Grid item xs={4}>
                                        <Typography variant="h4" fontWeight="regular" color="grey.500">
                                            {key.toFixed(2)}: 
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4} sx={{ textWrap: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <Typography textAlign="center" variant="h4" textWrap="pretty">
                                            {value}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4} sx={{ textWrap: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <Typography textAlign="end" variant="h4" textWrap="pretty">
                                            {(value * key).toFixed(2)}
                                        </Typography>
                                    </Grid>
                                </>
                            )
                        })}
                </>
            )}
            {renderGridItem('Total Cash In Drawer:', clip(report.endingCashCount?.total))}

            {renderDivider()}
            {renderTitle('TRANSACTION SUMMARY')}
            {renderGridItem('Cash In Drawer:', clip(report.endingCashCount?.total))}
            {renderGridItem('Cheque:', clip(report.transactionSummary.cheque))}
            {renderGridItem('Credit Card:', clip(0))}
            {renderGridItem('Gift Certificate:', clip(0))}
            {renderGridItem('Opening Fund:', clip(report.openingFund?.total))}
            {renderGridItem('Less Withdrawal:', clip(report.cashierReport?.withdraw))}
            {renderGridItem('Payments Received:', clip(report?.totalPayments))}
            {renderGridItem('Short/Over: ', clip(report?.cashDifference))}
        </Grid>
    );
}

Content.propTypes = {
    report: PropTypes.object
};

export default Content;
