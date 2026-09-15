import {
    exigirLogin,
    logout
} from './auth.js';

import { supabase } from './config.js';

import {
    carregarReservas,
    criarReserva,
    editarReserva as editarReservaBanco,
    excluirReserva as excluirReservaBanco,
    buscarReservaPorId
} from './reservas.js';


/*
|--------------------------------------------------------------------------
| HORÁRIOS
|--------------------------------------------------------------------------
|
| 1ª a 5ª aula  = manhã
| 6ª a 9ª aula   = tarde
|
*/

export const horarios = [
    {
        aula: 1,
        nome: '1ª Aula',
        turno: 'morning'
    },
    {
        aula: 2,
        nome: '2ª Aula',
        turno: 'morning'
    },
    {
        aula: 3,
        nome: '3ª Aula',
        turno: 'morning'
    },
    {
        aula: 4,
        nome: '4ª Aula',
        turno: 'morning'
    },
    {
        aula: 5,
        nome: '5ª Aula',
        turno: 'morning'
    },
    {
        aula: 6,
        nome: '6ª Aula',
        turno: 'afternoon'
    },
    {
        aula: 7,
        nome: '7ª Aula',
        turno: 'afternoon'
    },
    {
        aula: 8,
        nome: '8ª Aula',
        turno: 'afternoon'
    },
    {
        aula: 9,
        nome: '9ª Aula',
        turno: 'afternoon'
    }
];


/*
|--------------------------------------------------------------------------
| ESTADO DA APLICAÇÃO
|--------------------------------------------------------------------------
*/

let usuarioAtual = null;

let turmas = [];

let professores = [];

let reservas = [];

let reservaSelecionada = null;


/*
|--------------------------------------------------------------------------
| INICIAR
|--------------------------------------------------------------------------
*/

document.addEventListener(
    'DOMContentLoaded',
    iniciar
);


async function iniciar() {

    try {

        /*
         * Verifica autenticação
         */
        usuarioAtual = await exigirLogin();

        if (!usuarioAtual) {
            return;
        }


        /*
         * Configura informações do usuário
         */
        configurarUsuario();


        /*
         * Define data atual
         */
        definirDataInicial();


        /*
         * Carrega turmas
         */
        turmas = await carregarTurmas();

        preencherTurmas();


        /*
         * Somente Master precisa carregar
         * a lista de professores.
         */
        if (usuarioAtual.usuario_master) {

            professores =
                await carregarProfessores();

            preencherProfessores();
        }


        /*
         * Configura eventos
         */
        configurarEventos();


        /*
         * Carrega reservas
         */
        await atualizarTela();


    } catch (error) {

        console.error(
            'Erro ao iniciar aplicação:',
            error
        );

        alert(
            'Erro ao iniciar o sistema:\n' +
            error.message
        );
    }
}


/*
|--------------------------------------------------------------------------
| CARREGAR TURMAS
|--------------------------------------------------------------------------
*/

async function carregarTurmas() {

    const {
        data,
        error
    } = await supabase
        .from('turmas')
        .select(`
            id,
            serie,
            turma
        `)
        .order('serie', {
            ascending: true
        })
        .order('turma', {
            ascending: true
        });


    if (error) {

        console.error(
            'Erro ao carregar turmas:',
            error
        );

        throw new Error(
            'Erro ao carregar turmas: ' +
            error.message
        );
    }


    return data || [];
}


/*
|--------------------------------------------------------------------------
| CARREGAR PROFESSORES
|--------------------------------------------------------------------------
*/

async function carregarProfessores() {

    const {
        data,
        error
    } = await supabase
        .from('usuarios')
        .select(`
            id,
            nome,
            email,
            usuario_master
        `)
        .eq('usuario_master', false)
        .order('nome', {
            ascending: true
        });


    if (error) {

        console.error(
            'Erro ao carregar professores:',
            error
        );

        throw new Error(
            'Erro ao carregar professores: ' +
            error.message
        );
    }


    return data || [];
}


/*
|--------------------------------------------------------------------------
| CONFIGURAR USUÁRIO
|--------------------------------------------------------------------------
*/

function configurarUsuario() {

    const nome =
        document.getElementById(
            'currentUserDisplay'
        );


    if (nome) {

        nome.textContent =
            usuarioAtual.nome;
    }


    const cargo =
        document.getElementById(
            'currentUserRoleDisplay'
        );


    if (cargo) {

        cargo.textContent =
            usuarioAtual.usuario_master
                ? 'MASTER'
                : 'PROFESSOR';
    }


    /*
     * Recursos exclusivos do Master
     */
    if (
        usuarioAtual.usuario_master
    ) {

        const btnNewUser =
            document.getElementById(
                'btnNewUser'
            );


        if (btnNewUser) {

            btnNewUser
                .classList
                .remove('d-none');
        }


        const teacherContainer =
            document.getElementById(
                'teacherSelectContainer'
            );


        if (teacherContainer) {

            teacherContainer
                .classList
                .remove('d-none');
        }
    }
}


/*
|--------------------------------------------------------------------------
| DATA INICIAL
|--------------------------------------------------------------------------
*/

function definirDataInicial() {

    const input =
        document.getElementById(
            'filterDate'
        );


    if (!input) {
        return;
    }


    if (!input.value) {

        /*
         * Não usamos toISOString() aqui,
         * pois ele pode alterar o dia dependendo
         * do fuso horário.
         */
        const hoje =
            new Date();


        const ano =
            hoje.getFullYear();


        const mes =
            String(
                hoje.getMonth() + 1
            ).padStart(2, '0');


        const dia =
            String(
                hoje.getDate()
            ).padStart(2, '0');


        input.value =
            `${ano}-${mes}-${dia}`;
    }
}


/*
|--------------------------------------------------------------------------
| PREENCHER TURMAS
|--------------------------------------------------------------------------
*/

function preencherTurmas() {

    const select =
        document.getElementById(
            'filterClass'
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Selecione a turma...
        </option>
    `;


    turmas.forEach(
        turma => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                turma.id;


            option.textContent =
                `${turma.serie} - ${turma.turma}`;


            select.appendChild(
                option
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| PREENCHER PROFESSORES
|--------------------------------------------------------------------------
*/

function preencherProfessores() {

    const select =
        document.getElementById(
            'filterTeacher'
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Selecione o professor...
        </option>
    `;


    professores.forEach(
        professor => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                professor.id;


            option.textContent =
                professor.nome;


            select.appendChild(
                option
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| EVENTOS
|--------------------------------------------------------------------------
*/

function configurarEventos() {

    const filterDate =
        document.getElementById(
            'filterDate'
        );


    if (filterDate) {

        filterDate.addEventListener(
            'change',
            atualizarTela
        );
    }


    const filterClass =
        document.getElementById(
            'filterClass'
        );


    if (filterClass) {

        filterClass.addEventListener(
            'change',
            atualizarTela
        );
    }


    const filterTeacher =
        document.getElementById(
            'filterTeacher'
        );


    if (filterTeacher) {

        filterTeacher.addEventListener(
            'change',
            atualizarTela
        );
    }


    const btnLogout =
        document.getElementById(
            'btnLogout'
        );


    if (btnLogout) {

        btnLogout.addEventListener(
            'click',
            logout
        );
    }


    const btnMinus =
        document.getElementById(
            'btnQuantityMinus'
        );


    if (btnMinus) {

        btnMinus.addEventListener(
            'click',
            () => alterarQuantidade(-1)
        );
    }


    const btnPlus =
        document.getElementById(
            'btnQuantityPlus'
        );


    if (btnPlus) {

        btnPlus.addEventListener(
            'click',
            () => alterarQuantidade(1)
        );
    }


    const reservationForm =
        document.getElementById(
            'reservationForm'
        );


    if (reservationForm) {

        reservationForm.addEventListener(
            'submit',
            salvarReserva
        );
    }


    const newUserForm =
        document.getElementById(
            'newUserForm'
        );


    if (newUserForm) {

        newUserForm.addEventListener(
            'submit',
            cadastrarUsuario
        );
    }
}


/*
|--------------------------------------------------------------------------
| ATUALIZAR TELA
|--------------------------------------------------------------------------
*/

async function atualizarTela() {

    const input =
        document.getElementById(
            'filterDate'
        );


    const data =
        input
            ? input.value
            : '';


    if (!data) {
        return;
    }


    const morning =
        document.getElementById(
            'morningSlotsContainer'
        );


    const afternoon =
        document.getElementById(
            'afternoonSlotsContainer'
        );


    if (!morning || !afternoon) {
        return;
    }


    morning.innerHTML = `
        <div class="loading text-center p-3">
            <div class="spinner-border text-primary"></div>

            <div class="mt-2">
                Carregando reservas...
            </div>
        </div>
    `;


    afternoon.innerHTML = '';


    try {

        reservas =
            await carregarReservas(
                data
            );


        renderizarHorarios();


    } catch (error) {

        console.error(
            'Erro ao atualizar tela:',
            error
        );


        morning.innerHTML = `
            <div class="alert alert-danger">
                ${escapeHtml(error.message)}
            </div>
        `;


        afternoon.innerHTML = '';
    }
}


/*
|--------------------------------------------------------------------------
| RENDERIZAR HORÁRIOS
|--------------------------------------------------------------------------
*/

function renderizarHorarios() {

    const morning =
        document.getElementById(
            'morningSlotsContainer'
        );


    const afternoon =
        document.getElementById(
            'afternoonSlotsContainer'
        );


    if (!morning || !afternoon) {
        return;
    }


    morning.innerHTML = '';

    afternoon.innerHTML = '';


    horarios.forEach(
        horario => {

            const html =
                criarCardHorario(
                    horario
                );


            if (
                horario.turno ===
                'morning'
            ) {

                morning.innerHTML +=
                    html;

            } else {

                afternoon.innerHTML +=
                    html;
            }
        }
    );
}


/*
|--------------------------------------------------------------------------
| CRIAR CARD DO HORÁRIO
|--------------------------------------------------------------------------
*/

function criarCardHorario(
    horario
) {

    const reservasHorario =
        reservas.filter(
            reserva =>
                Number(
                    reserva.aula
                ) ===
                Number(
                    horario.aula
                )
        );


    const minhaReserva =
        reservasHorario.find(
            reserva =>
                Number(
                    reserva.id_usuario
                ) ===
                Number(
                    usuarioAtual.id
                )
        );


    /*
     * Se não existem reservas neste horário
     */
    if (
        reservasHorario.length === 0
    ) {

        return criarCardDisponivel(
            horario
        );
    }


    /*
     * Existem reservas.
     *
     * IMPORTANTE:
     * uma reserva não bloqueia a aula
     * para outros professores.
     */
    return criarCardComReservas(
        horario,
        reservasHorario,
        minhaReserva
    );
}


/*
|--------------------------------------------------------------------------
| CARD DISPONÍVEL
|--------------------------------------------------------------------------
*/

function criarCardDisponivel(
    horario
) {

    return `
        <div
            class="card
                   slot-card
                   available
                   p-3"
        >

            <div
                class="d-flex
                       justify-content-between
                       align-items-center"
            >

                <div>

                    <span class="fw-bold">
                        ${escapeHtml(
                            horario.nome
                        )}
                    </span>

                    <span
                        class="badge
                               bg-success
                               badge-status
                               ms-2"
                    >
                        Disponível
                    </span>

                </div>


                <button
                    type="button"
                    class="btn
                           btn-sm
                           btn-success"
                    onclick="
                        window.abrirReserva(
                            ${horario.aula}
                        )
                    "
                >

                    <i
                        class="bi
                               bi-check-circle"
                    ></i>

                    Reservar

                </button>

            </div>

        </div>
    `;
}


/*
|--------------------------------------------------------------------------
| CARD COM RESERVAS
|--------------------------------------------------------------------------
*/

function criarCardComReservas(
    horario,
    reservasHorario,
    minhaReserva
) {

    let html = `

        <div
            class="card
                   slot-card
                   reserved
                   p-3"
        >

            <div
                class="d-flex
                       justify-content-between
                       align-items-center"
            >

                <div>

                    <span class="fw-bold">
                        ${escapeHtml(
                            horario.nome
                        )}
                    </span>

                    <span
                        class="badge
                               bg-danger
                               badge-status
                               ms-2"
                    >
                        Com reservas
                    </span>

                </div>

            </div>

    `;


    /*
     * Lista cada reserva do horário
     */
    reservasHorario.forEach(
        reserva => {

            const professor =
                reserva.usuarios?.nome ||
                encontrarNomeProfessor(
                    reserva.id_usuario
                );


            const turma =
                reserva.turmas
                    ? `${reserva.turmas.serie} - ${reserva.turmas.turma}`
                    : encontrarNomeTurma(
                        reserva.id_turma
                    );


            const souDono =
                Number(
                    reserva.id_usuario
                ) ===
                Number(
                    usuarioAtual.id
                );


            html += `

                <div
                    class="reservation-row
                           border-top
                           mt-3
                           pt-3"
                >

                    <div class="small">

                        <div>

                            <i
                                class="bi
                                       bi-person-fill"
                            ></i>

                            <strong>
                                Professor:
                            </strong>

                            ${escapeHtml(
                                professor
                            )}

                        </div>


                        <div>

                            <i
                                class="bi
                                       bi-people-fill"
                            ></i>

                            <strong>
                                Turma:
                            </strong>

                            ${escapeHtml(
                                turma
                            )}

                        </div>


                        <div>

                            <i
                                class="bi
                                       bi-laptop"
                            ></i>

                            <strong>
                                Chromebooks:
                            </strong>

                            ${Number(
                                reserva.quantidade
                            )}

                        </div>

                    </div>


                    <div
                        class="d-flex
                               justify-content-end
                               gap-2
                               mt-2"
                    >

                        ${
                            (
                                usuarioAtual.usuario_master ||
                                souDono
                            )
                            ? `

                                <button
                                    type="button"
                                    class="btn
                                           btn-sm
                                           btn-outline-warning"
                                    onclick="
                                        window.editarReserva(
                                            ${reserva.id}
                                        )
                                    "
                                >

                                    <i
                                        class="bi
                                               bi-pencil"
                                    ></i>

                                    Editar

                                </button>

                            `
                            : ''
                        }


                        ${
                            usuarioAtual.usuario_master
                            ? `

                                <button
                                    type="button"
                                    class="btn
                                           btn-sm
                                           btn-outline-danger"
                                    onclick="
                                        window.excluirReserva(
                                            ${reserva.id}
                                        )
                                    "
                                >

                                    <i
                                        class="bi
                                               bi-trash"
                                    ></i>

                                    Excluir

                                </button>

                            `
                            : ''
                        }

                    </div>

                </div>

            `;
        }
    );


    /*
     * Se o professor logado ainda não possui
     * reserva neste horário, ele pode criar uma.
     *
     * Master também pode criar uma nova reserva.
     */
    if (
        usuarioAtual.usuario_master ||
        !minhaReserva
    ) {

        html += `

            <div class="text-end mt-3">

                <button
                    type="button"
                    class="btn
                           btn-sm
                           btn-success"
                    onclick="
                        window.abrirReserva(
                            ${horario.aula}
                        )
                    "
                >

                    <i
                        class="bi
                               bi-plus-circle"
                    ></i>

                    Nova Reserva

                </button>

            </div>

        `;
    }


    html += `
        </div>
    `;


    return html;
}


/*
|--------------------------------------------------------------------------
| ABRIR MODAL DE RESERVA
|--------------------------------------------------------------------------
*/

window.abrirReserva =
async function (aula) {

    const dateInput =
        document.getElementById(
            'filterDate'
        );


    const classSelect =
        document.getElementById(
            'filterClass'
        );


    const data =
        dateInput
            ? dateInput.value
            : '';


    const turmaId =
        classSelect
            ? Number(
                classSelect.value
            )
            : 0;


    if (!data) {

        alert(
            'Selecione a data.'
        );

        return;
    }


    if (!turmaId) {

        alert(
            'Selecione a turma.'
        );

        return;
    }


    /*
     * Professor que receberá a reserva
     */
    let professor =
        usuarioAtual;


    /*
     * Master escolhe o professor
     */
    if (
        usuarioAtual.usuario_master
    ) {

        const teacherSelect =
            document.getElementById(
                'filterTeacher'
            );


        const professorId =
            teacherSelect
                ? Number(
                    teacherSelect.value
                )
                : 0;


        if (!professorId) {

            alert(
                'Selecione o professor.'
            );

            return;
        }


        professor =
            professores.find(
                item =>
                    Number(
                        item.id
                    ) ===
                    professorId
            );


        if (!professor) {

            alert(
                'Professor não encontrado.'
            );

            return;
        }
    }


    /*
     * Verifica se este professor já possui
     * reserva nesta aula/data.
     */
    const existente =
        reservas.find(
            reserva =>
                Number(
                    reserva.aula
                ) ===
                Number(
                    aula
                ) &&
                Number(
                    reserva.id_usuario
                ) ===
                Number(
                    professor.id
                )
        );


    if (existente) {

        alert(
            `${professor.nome} já possui uma reserva na ${aula}ª aula.`
        );

        return;
    }


    const turma =
        turmas.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    turmaId
                )
        );


    /*
     * Preenche modal
     */
    const reservationDate =
        document.getElementById(
            'reservationDate'
        );


    if (reservationDate) {

        reservationDate.value =
            data;
    }


    const reservationLesson =
        document.getElementById(
            'reservationLesson'
        );


    if (reservationLesson) {

        reservationLesson.value =
            `${aula}ª Aula`;
    }


    const reservationClass =
        document.getElementById(
            'reservationClass'
        );


    if (reservationClass) {

        reservationClass.value =
            turma
                ? `${turma.serie} - ${turma.turma}`
                : '';
    }


    const reservationQuantity =
        document.getElementById(
            'reservationQuantity'
        );


    if (reservationQuantity) {

        reservationQuantity.value =
            1;
    }


    const errorBox =
        document.getElementById(
            'reservationError'
        );


    if (errorBox) {

        errorBox.classList.add(
            'd-none'
        );

        errorBox.textContent = '';
    }


    /*
     * Professor do modal
     */
    const teacherContainer =
        document.getElementById(
            'reservationTeacherContainer'
        );


    const teacherInput =
        document.getElementById(
            'reservationTeacher'
        );


    if (
        usuarioAtual.usuario_master
    ) {

        if (teacherContainer) {

            teacherContainer
                .classList
                .remove('d-none');
        }


        if (teacherInput) {

            teacherInput.value =
                professor.nome;
        }

    } else {

        if (teacherContainer) {

            teacherContainer
                .classList
                .add('d-none');
        }
    }


    /*
     * Guarda informações da reserva
     */
    reservaSelecionada = {

        data:
            data,

        aula:
            Number(aula),

        turmaId:
            Number(turmaId),

        professorId:
            Number(professor.id)
    };


    const modalElement =
        document.getElementById(
            'reservationModal'
        );


    if (!modalElement) {

        alert(
            'Modal de reserva não encontrado no HTML.'
        );

        return;
    }


    const modal =
        new bootstrap.Modal(
            modalElement
        );


    modal.show();
};


/*
|--------------------------------------------------------------------------
| QUANTIDADE
|--------------------------------------------------------------------------
*/

function alterarQuantidade(
    valor
) {

    const input =
        document.getElementById(
            'reservationQuantity'
        );


    if (!input) {
        return;
    }


    let quantidade =
        Number(
            input.value
        ) || 1;


    quantidade += valor;


    if (quantidade < 1) {
        quantidade = 1;
    }


    if (quantidade > 12) {
        quantidade = 12;
    }


    input.value =
        quantidade;
}


/*
|--------------------------------------------------------------------------
| SALVAR RESERVA
|--------------------------------------------------------------------------
*/

async function salvarReserva(
    event
) {

    event.preventDefault();


    if (!reservaSelecionada) {

        return;
    }


    const quantityInput =
        document.getElementById(
            'reservationQuantity'
        );


    const quantidade =
        quantityInput
            ? Number(
                quantityInput.value
            )
            : 0;


    const errorBox =
        document.getElementById(
            'reservationError'
        );


    if (errorBox) {

        errorBox.classList.add(
            'd-none'
        );

        errorBox.textContent = '';
    }


    if (
        !Number.isInteger(
            quantidade
        ) ||
        quantidade < 1 ||
        quantidade > 12
    ) {

        mostrarErroReserva(
            'Informe uma quantidade entre 1 e 12 Chromebooks.'
        );

        return;
    }


    const button =
        document.getElementById(
            'btnSaveReservation'
        );


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <span
                class="spinner-border
                       spinner-border-sm
                       me-2"
            ></span>

            Salvando...
        `;
    }


    try {

        await criarReserva({

            data:
                reservaSelecionada.data,

            aula:
                reservaSelecionada.aula,

            quantidade:
                quantidade,

            turmaId:
                reservaSelecionada.turmaId,

            idUsuario:
                reservaSelecionada.professorId
        });


        const modalElement =
            document.getElementById(
                'reservationModal'
            );


        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );


        if (modal) {
            modal.hide();
        }


        reservaSelecionada =
            null;


        await atualizarTela();


    } catch (error) {

        console.error(
            'Erro ao salvar reserva:',
            error
        );


        mostrarErroReserva(
            error.message
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML = `
                <i
                    class="bi
                           bi-check-circle"
                ></i>

                Confirmar Reserva
            `;
        }
    }
}


/*
|--------------------------------------------------------------------------
| MOSTRAR ERRO DA RESERVA
|--------------------------------------------------------------------------
*/

function mostrarErroReserva(
    mensagem
) {

    const errorBox =
        document.getElementById(
            'reservationError'
        );


    if (!errorBox) {

        alert(mensagem);

        return;
    }


    errorBox.textContent =
        mensagem;


    errorBox.classList.remove(
        'd-none'
    );
}


/*
|--------------------------------------------------------------------------
| EDITAR RESERVA
|--------------------------------------------------------------------------
*/

window.editarReserva =
async function (id) {

    try {

        const reserva =
            await buscarReservaPorId(
                id
            );


        if (!reserva) {

            alert(
                'Reserva não encontrada.'
            );

            return;
        }


        /*
         * Verifica autorização
         */
        const souDono =
            Number(
                reserva.id_usuario
            ) ===
            Number(
                usuarioAtual.id
            );


        if (
            !usuarioAtual.usuario_master &&
            !souDono
        ) {

            alert(
                'Você não pode editar esta reserva.'
            );

            return;
        }


        /*
         * Quantidade atual
         */
        const novaQuantidadeTexto =
            prompt(
                'Quantidade de Chromebooks (1 a 12):',
                reserva.quantidade
            );


        if (
            novaQuantidadeTexto === null
        ) {

            return;
        }


        const quantidade =
            Number(
                novaQuantidadeTexto
            );


        if (
            !Number.isInteger(
                quantidade
            ) ||
            quantidade < 1 ||
            quantidade > 12
        ) {

            alert(
                'A quantidade deve estar entre 1 e 12.'
            );

            return;
        }


        /*
         * Turma atual
         */
        const turmaAtual =
            turmas.find(
                turma =>
                    Number(
                        turma.id
                    ) ===
                    Number(
                        reserva.id_turma
                    )
            );


        const turmaAtualTexto =
            turmaAtual
                ? `${turmaAtual.serie} - ${turmaAtual.turma}`
                : 'Não encontrada';


        const novaTurmaTexto =
            prompt(
                `ID da nova turma.\n\nTurma atual: ${turmaAtualTexto}`,
                reserva.id_turma
            );


        if (
            novaTurmaTexto === null
        ) {

            return;
        }


        const novaTurma =
            Number(
                novaTurmaTexto
            );


        const turmaExiste =
            turmas.some(
                turma =>
                    Number(
                        turma.id
                    ) ===
                    novaTurma
            );


        if (!turmaExiste) {

            alert(
                'A turma informada não existe.'
            );

            return;
        }


        /*
         * Atualiza
         */
        await editarReservaBanco({

            reservaId:
                reserva.id,

            data:
                reserva.data_reserva,

            aula:
                reserva.aula,

            quantidade:
                quantidade,

            turmaId:
                novaTurma,

            idUsuario:
                reserva.id_usuario
        });


        await atualizarTela();


        alert(
            'Reserva atualizada com sucesso.'
        );


    } catch (error) {

        console.error(
            'Erro ao editar reserva:',
            error
        );


        alert(
            error.message
        );
    }
};


/*
|--------------------------------------------------------------------------
| EXCLUIR RESERVA
|--------------------------------------------------------------------------
*/

window.excluirReserva =
async function (id) {

    /*
     * Segurança adicional no frontend
     */
    if (
        !usuarioAtual.usuario_master
    ) {

        alert(
            'Somente o usuário Master pode excluir reservas.'
        );

        return;
    }


    const confirmar =
        confirm(
            'Deseja realmente excluir esta reserva?'
        );


    if (!confirmar) {
        return;
    }


    try {

        await excluirReservaBanco(
            id,
            usuarioAtual
        );


        await atualizarTela();


        alert(
            'Reserva excluída com sucesso.'
        );


    } catch (error) {

        console.error(
            'Erro ao excluir reserva:',
            error
        );


        alert(
            error.message
        );
    }
};


/*
|--------------------------------------------------------------------------
| CADASTRAR USUÁRIO
|--------------------------------------------------------------------------
*/

async function cadastrarUsuario(
    event
) {

    event.preventDefault();


    /*
     * Apenas Master
     */
    if (
        !usuarioAtual.usuario_master
    ) {

        alert(
            'Somente usuários Master podem cadastrar usuários.'
        );

        return;
    }


    const nomeInput =
        document.getElementById(
            'userName'
        );


    const emailInput =
        document.getElementById(
            'userEmail'
        );


    const passwordInput =
        document.getElementById(
            'userPassword'
        );


    const roleInput =
        document.getElementById(
            'userRole'
        );


    const nome =
        nomeInput
            ? nomeInput.value.trim()
            : '';


    const email =
        emailInput
            ? emailInput.value.trim()
            : '';


    const password =
        passwordInput
            ? passwordInput.value
            : '';


    const usuarioMaster =
        roleInput
            ? roleInput.value === 'true'
            : false;


    const errorBox =
        document.getElementById(
            'newUserError'
        );


    if (errorBox) {

        errorBox.classList.add(
            'd-none'
        );

        errorBox.textContent = '';
    }


    if (!nome) {

        mostrarErroUsuario(
            'Informe o nome do usuário.'
        );

        return;
    }


    if (!email) {

        mostrarErroUsuario(
            'Informe o e-mail.'
        );

        return;
    }


    if (!password) {

        mostrarErroUsuario(
            'Informe a senha.'
        );

        return;
    }


    const button =
        document.getElementById(
            'btnSaveUser'
        );


    if (button) {
        button.disabled = true;
    }


    try {

        const {
            data,
            error
        } =
            await supabase.functions.invoke(
                'criar-usuario',
                {
                    body: {
                        nome,
                        email,
                        password,
                        usuario_master:
                            usuarioMaster
                    }
                }
            );


        if (error) {

            throw new Error(
                error.message
            );
        }


        if (data?.error) {

            throw new Error(
                data.error
            );
        }


        const form =
            document.getElementById(
                'newUserForm'
            );


        if (form) {
            form.reset();
        }


        const modalElement =
            document.getElementById(
                'newUserModal'
            );


        if (modalElement) {

            const modal =
                bootstrap.Modal.getInstance(
                    modalElement
                );


            if (modal) {
                modal.hide();
            }
        }


        alert(
            'Usuário cadastrado com sucesso.'
        );


        /*
         * Atualiza lista de professores
         */
        professores =
            await carregarProfessores();


        preencherProfessores();


    } catch (error) {

        console.error(
            'Erro ao cadastrar usuário:',
            error
        );


        mostrarErroUsuario(
            error.message
        );


    } finally {

        if (button) {
            button.disabled = false;
        }
    }
}


/*
|--------------------------------------------------------------------------
| MOSTRAR ERRO DO USUÁRIO
|--------------------------------------------------------------------------
*/

function mostrarErroUsuario(
    mensagem
) {

    const errorBox =
        document.getElementById(
            'newUserError'
        );


    if (!errorBox) {

        alert(mensagem);

        return;
    }


    errorBox.textContent =
        mensagem;


    errorBox.classList.remove(
        'd-none'
    );
}


/*
|--------------------------------------------------------------------------
| AUXILIARES
|--------------------------------------------------------------------------
*/

function encontrarNomeProfessor(
    id
) {

    const professor =
        professores.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(id)
        );


    return professor
        ? professor.nome
        : 'Professor';
}


function encontrarNomeTurma(
    id
) {

    const turma =
        turmas.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(id)
        );


    return turma
        ? `${turma.serie} - ${turma.turma}`
        : 'Turma';
}


function escapeHtml(
    value
) {

    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}