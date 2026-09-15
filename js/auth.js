import { supabase } from './config.js';


/*
==================================================
USUÁRIO AUTENTICADO
==================================================
*/

export async function getUsuarioLogado() {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();


    if (error || !user) {

        return null;

    }


    /*
     * Busca o perfil na tabela usuarios
     */

    const {
        data: usuario,
        error: usuarioError
    } = await supabase

        .from('usuarios')

        .select(`
            id,
            nome,
            email,
            usuario_master
        `)

        .eq(
            'email',
            user.email
        )

        .single();


    if (usuarioError) {

        console.error(
            'Erro ao buscar usuário:',
            usuarioError
        );

        return null;

    }


    return usuario;

}



/*
==================================================
EXIGIR LOGIN
==================================================
*/

export async function exigirLogin() {

    const usuario =
        await getUsuarioLogado();


    if (!usuario) {

        window.location.href =
            '/login.html';

        return null;

    }


    return usuario;

}



/*
==================================================
LOGOUT
==================================================
*/

export async function logout() {

    await supabase.auth.signOut();

    window.location.href =
        '/login.html';

}