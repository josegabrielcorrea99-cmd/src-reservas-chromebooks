import { supabase } from './config.js';

async function listarDados() {
    const { data, error, status, statusText } = await supabase
        .from('usuarios')
        .select('*');

    console.log('STATUS:', status);
    console.log('STATUS TEXT:', statusText);
    console.log('DATA:', data);
    console.log('ERROR:', error);
}

listarDados();