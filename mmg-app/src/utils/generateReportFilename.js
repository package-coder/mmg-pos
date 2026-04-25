import { kebabCase, toLower } from 'lodash';
import { DEFAULT_BRANCH_FILTER } from 'ui-component/filter/BranchFilter';
import { DateFilterEnum, generateDateName } from 'ui-component/filter/DateFilter';

const generateReportFilename = (initialName, { branchFilter, dateFilter, customDate }) => {
    let name = initialName;

    if(branchFilter)
        name = toLower(kebabCase(branchFilter)) + '-' + name;
    if (dateFilter != DateFilterEnum.ALL) 
        name = name + '-' + generateDateName(dateFilter, customDate);

    return name;
};

export default generateReportFilename;
