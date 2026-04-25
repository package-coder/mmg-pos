import Header from '../XReadingReport/Header';
import Content from './Content';
import Footer from './Footer';
import PropTypes from 'prop-types';

function ZReadingReport({ report, children, reprint }) {
    return (
        <>
            <Header report={report} />
            <Content reprint={reprint} report={report} />
            {children}
            <Footer report={report} />
        </>
    );
}

ZReadingReport.propTypes = {
    report: PropTypes.object,
    children: PropTypes.node
};

export default ZReadingReport;
