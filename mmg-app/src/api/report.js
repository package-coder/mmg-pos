import { server } from 'api';

export const REPORTS_ENDPOINTS = '';

async function GetReports(reportData) {
    const branchesString = reportData?.branch;
    const formattedStrings = branchesString.map((branchId) => `&branchIds=${branchId}`);
    // Combine all formatted strings into one single string
    const finalString = formattedStrings.join('');
    const {
        data: { data }
    } = await server.get(
        `${REPORTS_ENDPOINTS}/reports?min=${reportData?.startDate}&max=${reportData?.endDate}&type=${reportData?.reportType}${finalString}`
    );
    return data;
}

export default {
    GetReports
};
