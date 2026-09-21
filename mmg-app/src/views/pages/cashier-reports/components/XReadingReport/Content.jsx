import { Divider, Grid, Stack, Typography } from '@mui/material';
import moment from 'moment';
import Currency from 'ui-component/Currency';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';

function Content({ report, reprint }) {
   
    // const cash = ['0.05', '0.5', '1', '5', '10', '20', '50', '100', '200', '500', '1000']
    const renderGridItem = (label, value, highlight = false, indent = false) => (
        <>
            <Grid item xs={6}>
                <Typography sx={{ marginLeft: indent ? 4 : 0 }} variant="h4" fontWeight="regular" color="grey.500">
                    {label}
                </Typography>
            </Grid>
            <Grid item xs={6} sx={{ textWrap: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            {reprint && renderGridItem('Reprint: ', moment().format('YYYY-MM-DD hh:mmA'))}
            {renderGridItem('Cashier Name: ', startCase(`${report.cashier?.first_name} ${report.cashier?.last_name}`))}
            {renderGridItem('Report Date: ', moment(report.date).format('YYYY-MM-DD'))}
            {renderGridItem('Time In:', moment(report.timeIn).format('hh:mm A'))}
            {renderGridItem(
                'Time Out:', report.timeOut ? moment(report.timeOut).format('hh:mm A') : '')}
            {/* {renderDivider()} */}

            {/* {renderGridItem('Openning Fund: ', clip(report.openingFund?.total || 0))} */}
            {/* {renderGridItem('Ending Cash Total: ', clip(report.endingCashOnHand?.total || 0))} */}
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
           {renderGridItem('Beg. Invoice #: ', String(report.sales?.invoiceStartNumber || 0).padStart(6, '0'))}
           {renderGridItem('End. Invoice #: ', String(report.sales?.invoiceEndNumber || 0).padStart(6, '0'))}
            {/* {renderGridItem('Total Cash Count: ', report.endingCashOnHand?.total || 0)} */}
            {renderDivider()}
            {renderTitle('SALES BREAKDOWN')}

            {renderGridItem('VATable Sales: ', clip(report.salesSummary?.vatableSales))}
            {renderGridItem('VAT-Exempt Sales: ', clip(report.salesSummary?.vatExemptSales))}
            {renderGridItem('Zero-Rated Sales: ', clip(report.salesSummary?.zeroRatedSales))}
            {renderGridItem('Gross Sales: ', clip(report.salesSummary?.grossSales))}
            {renderGridItem('Less Discount: ', clip(-(report.salesSummary?.discount || 0)))}
            {renderGridItem('Less Cancelled: ', clip(-(report.salesSummary?.cancelled || 0)))}
            {renderGridItem('Less Refunded: ', clip(-(report.salesSummary?.refunded || 0)))}
            {renderGridItem('Net Sales: ', clip(report.salesSummary?.netSales))}
            {/* {renderGridItem('Cash Loss: ', `(${clip(report.sales?.cashLoss)})`)} */}
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
            {/* One row per non-cash payment method used (names are admin-managed in Settings > Payment Methods). */}
            {(report.paymentBreakdown || [])
                .filter((method) => method.kind !== 'cash')
                .map((method) => renderGridItem(`${method.name}:`, clip(method.amount)))}
            {renderGridItem('Opening Fund:', clip(report.openingFund?.total))}
            {renderGridItem('Less Withdrawal:', clip(report.withdraw || 0))}
            {renderGridItem('Payments Received:', clip(report.totalPayments))}
            {renderGridItem('Short/Over: ', clip(report.sales?.cashDifference))}

        </Grid>
    );
}

Content.propTypes = {
    report: PropTypes.object
};

export default Content;
