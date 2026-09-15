import { supabase } from './config.js';


const form =
    document.getElementById(
        'loginForm'
    );


const errorBox =
    document.getElementById(
        'loginError'
    );


const button =
    document.getElementById(
        'btnLogin'
    );



form.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();


        errorBox.classList.add(
            'd-none'
        );


        const email =
            document
                .getElementById('email')
                .value
                .trim();


        const senha =
            document
                .getElementById('senha')
                .value;


        button.disabled = true;


        button.innerHTML = `

            <span
                class="spinner-border spinner-border-sm me-2"
            ></span>

            Entrando...

        `;


        try {

            /*
            ==========================================
            AUTENTICAÇÃO SUPABASE
            ==========================================
            */

            const {
                data,
                error
            } = await supabase.auth
                .signInWithPassword({

                    email,

                    password:
                        senha

                });


            if (error) {

                throw new Error(
                    'E-mail ou senha inválidos.'
                );

            }


            /*
            ==========================================
            VERIFICA SE EXISTE NO NOSSO CADASTRO
            ==========================================
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
                    email
                )

                .single();


            if (
                usuarioError ||
                !usuario
            ) {

                await supabase.auth.signOut();


                throw new Error(
                    'Seu usuário não está cadastrado no sistema.'
                );

            }


            /*
            ==========================================
            LOGIN OK
            ==========================================
            */

            window.location.href =
                '/index.html';


        } catch (error) {

            console.error(
                error
            );


            errorBox.textContent =
                error.message;


            errorBox.classList.remove(
                'd-none'
            );


        } finally {

            button.disabled =
                false;


            button.innerHTML = `

                <i class="bi bi-box-arrow-in-right"></i>

                Entrar

            `;

        }

    }
);