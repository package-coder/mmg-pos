import { useContext, createContext } from 'react';
import { useAuth } from './AuthProvider';
import { useQuery } from 'react-query';
import { DateFilterEnum } from 'ui-component/filter/DateFilter';
import cashier_report from 'api/cashier_report';
import _ from 'lodash'

export const CashierReportContext = createContext();

export const CashierStatusReportEnum = Object.freeze({
    NO_REPORT: 0,
    CLOCKED_IN: 1,
    CLOCKED_OUT: 2
});

const CashierReportProvider = ({ 
    children, 
    dateFilter = DateFilterEnum.TODAY,
    userReport = true
}) => {

    const { user, loading: fetchingUser, } = useAuth();

    const params = _.pickBy(
        { 
            dateFilter,
            cashierId: userReport ? user?._id : null 
        },
        (value) => value != null
    );


    const { data, isLoading, refetch, isRefetching, } = useQuery(
        'cashier-report',
        () => cashier_report.GetAllCashierReport(params),
        { enabled: !fetchingUser && (userReport && user != null) }
    );

    const reports = data?.reports;
    const previousReport = data?.previousReports;
    const reportForToday = dateFilter == DateFilterEnum.TODAY ? data?.reports?.[0] : null;
    
    const loading = isLoading || fetchingUser

    const isClockedIn = getStatusForToday() == CashierStatusReportEnum.CLOCKED_IN
    const hasNoReportToday = getStatusForToday() == CashierStatusReportEnum.NO_REPORT

    function getStatusForToday() {
        if(dateFilter != DateFilterEnum.TODAY)
            return null;

        if(!reportForToday)
            return CashierStatusReportEnum.NO_REPORT

        return reportForToday.timeOut == null 
            ? CashierStatusReportEnum.CLOCKED_IN 
            : CashierStatusReportEnum.CLOCKED_OUT 
    }
    function getDrawerBalance () { return Number(reportForToday?.openingFund?.total + reportForToday.sales.totalNetSales || 0) }

    return (
        <CashierReportContext.Provider 
            value={{ 
                reports, 
                reportForToday, 
                previousReport, 
                loading, 
                isRefetching,
                isClockedIn,
                hasNoReportToday,
                refetch, 
                getDrawerBalance,
                getStatusForToday
            }}
        >
            {children}
        </CashierReportContext.Provider>
    );
};

export default CashierReportProvider;

export const useCashierReport = () => {
    return useContext(CashierReportContext);
};

export const CashierReportWrapper = (Element, props) => () =>
    <CashierReportProvider value={props}>
        <Element />
    </CashierReportProvider>