import { isNumber } from 'lodash';
import { FaPesoSign } from 'react-icons/fa6';

const Currency = ({ value, iconStyle }) => (
    <>
        <FaPesoSign style={{ marginLeft: '6px', fontSize: '0.9rem', ...iconStyle }} />
        {isNumber(value) ? new Intl.NumberFormat().format(value.toFixed(2)) : 0}
    </>
);

export default Currency;
