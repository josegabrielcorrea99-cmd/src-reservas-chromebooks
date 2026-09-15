import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUr1 = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log("CONFIG.JS FOI CARREGADO!");
console.log("URL:", supabaseUr1);
console.log("KEY:", supabaseKey);

export const supabase = createClient(
    supabaseUr1,
    supabaseKey
);