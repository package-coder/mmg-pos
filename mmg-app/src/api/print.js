import { server } from 'api';
import axios from 'axios';


async function Print(model) {
    
    const result = await server.post('/print', model);
    return result.data.data;
}

async function PrintReport(model) {
    const result = await server.post('/print-report', model);
    return result.data.data;
}

async function Display(params) {
    const type = !params.type ? '' : `/${params.type}`
    await server.post('/display' + type, params);
}

export default {
    Print,
    PrintReport,
    Display
};
