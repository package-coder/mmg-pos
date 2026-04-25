import { useNavigate } from 'react-router-dom';
import SecondaryCard from 'ui-component/cards/SecondaryCard';

export default function () {
    const navigate = useNavigate();
    return (
        <SecondaryCard boxStyle={{ height: '100%' }} title={`John Smith Report`} onBack={() => navigate(-1)}>
            Some text
        </SecondaryCard>
    );
}
