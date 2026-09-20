import { server } from 'api';
import { isDevTestModeEnabled } from 'utils/devTestMode';

export const REPORTS_ENDPOINTS = '';

async function GetReports(reportData) {
    const branchesString = reportData?.branch;
    const formattedStrings = branchesString.map((branchId) => `&branchIds=${branchId}`);
    // Combine all formatted strings into one single string
    const finalString = formattedStrings.join('');
    // Dev Test Mode on for this browser -> dev-test sales count toward this report too (see
    // app/routes/sales/report_generators/*.py).
    const includeDevTest = isDevTestModeEnabled() ? '&includeDevTest=true' : '';
    const {
        data: { data }
    } = await server.get(
        `${REPORTS_ENDPOINTS}/reports?min=${reportData?.startDate}&max=${reportData?.endDate}&type=${reportData?.reportType}${finalString}${includeDevTest}`
    );
    return data;
}

export default {
    GetReports
};
