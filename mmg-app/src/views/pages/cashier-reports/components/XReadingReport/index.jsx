import Content from './Content';
import Footer from './Footer';
import Header from './Header';
import PropTypes from 'prop-types';

function XReadingReport({ report, children, reprint }) {
    return (
        <>
            <Header report={report} />
            <Content reprint={reprint} report={report} />
            {children}
            <Footer report={report} />
        </>
    );
}

XReadingReport.propTypes = {
    report: PropTypes.object,
    children: PropTypes.node
};

export default XReadingReport;
