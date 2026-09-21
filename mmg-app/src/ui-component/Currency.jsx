import { isNumber } from 'lodash';
import { FaPesoSign } from 'react-icons/fa6';

const Currency = ({ value, iconStyle }) => (
    <>
        <FaPesoSign style={{ marginLeft: '6px', fontSize: '0.9rem', ...iconStyle }} />
        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(isNumber(value) ? value : 0)}
    </>
);

export default Currency;
