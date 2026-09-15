import { supabase } from './config.js';

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

const CAMPOS_RESERVA = `
    id,
    data_reserva,
    data_criacao,
    aula,
    quantidade,
    carregado,
    id_turma,
    id_usuario
`;


/*
|--------------------------------------------------------------------------
| LISTAR RESERVAS DE UMA DATA
|--------------------------------------------------------------------------
|
| Busca todas as reservas de determinado dia.
|
| IMPORTANTE:
| A data utilizada para pesquisa é data_reserva.
| data_criacao representa somente quando a reserva foi criada.
|
*/

export async function carregarReservas(data) {

    if (!data) {
        throw new Error('A data da reserva não foi informada.');
    }

    const { data: reservas, error } = await supabase
        .from('reservas')
        .select(CAMPOS_RESERVA)
        .eq('data_reserva', data)
        .order('aula', { ascending: true });

    if (error) {
        console.error('Erro ao carregar reservas:', error);

        throw new Error(
            'Erro ao carregar reservas: ' + error.message
        );
    }

    return reservas || [];
}


/*
|--------------------------------------------------------------------------
| BUSCAR RESERVA DE UM PROFESSOR EM UMA AULA
|--------------------------------------------------------------------------
|
| Verifica se determinado professor já possui uma reserva:
|
| professor + data + aula
|
| Essa regra é importante porque cada professor só pode ter
| uma turma por horário.
|
*/

export async function buscarReservaDoProfessor(
    idUsuario,
    data,
    aula,
    reservaIgnorarId = null
) {

    if (!idUsuario) {
        throw new Error('O professor não foi informado.');
    }

    if (!data) {
        throw new Error('A data não foi informada.');
    }

    if (!aula) {
        throw new Error('A aula não foi informada.');
    }

    let query = supabase
        .from('reservas')
        .select(CAMPOS_RESERVA)
        .eq('id_usuario', Number(idUsuario))
        .eq('data_reserva', data)
        .eq('aula', Number(aula));

    /*
     * Quando estamos editando uma reserva,
     * precisamos ignorar a própria reserva.
     */
    if (reservaIgnorarId !== null) {
        query = query.neq(
            'id',
            Number(reservaIgnorarId)
        );
    }

    const { data: reserva, error } = await query
        .maybeSingle();

    if (error) {
        console.error(
            'Erro ao verificar reserva existente:',
            error
        );

        throw new Error(
            'Erro ao verificar reserva existente: ' +
            error.message
        );
    }

    return reserva;
}


/*
|--------------------------------------------------------------------------
| CRIAR RESERVA
|--------------------------------------------------------------------------
|
| Regras:
|
| - quantidade entre 1 e 12
| - professor + data + aula não pode se repetir
| - data_reserva recebe o dia escolhido
| - data_criacao recebe o momento atual
|
*/

export async function criarReserva({
    data,
    aula,
    quantidade,
    turmaId,
    idUsuario
}) {

    /*
     * Validação da data
     */
    if (!data) {
        throw new Error(
            'Selecione a data da reserva.'
        );
    }

    /*
     * Validação da aula
     */
    if (
        aula === undefined ||
        aula === null ||
        aula === ''
    ) {
        throw new Error(
            'Selecione o horário da reserva.'
        );
    }

    /*
     * Validação da turma
     */
    if (
        turmaId === undefined ||
        turmaId === null ||
        turmaId === ''
    ) {
        throw new Error(
            'Selecione a turma.'
        );
    }

    /*
     * Validação do professor
     */
    if (
        idUsuario === undefined ||
        idUsuario === null ||
        idUsuario === ''
    ) {
        throw new Error(
            'O professor da reserva não foi informado.'
        );
    }

    /*
     * Converte quantidade para número
     */
    quantidade = Number(quantidade);

    /*
     * Cada professor pode reservar de 1 a 12 Chromebooks.
     */
    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > 12
    ) {
        throw new Error(
            'A quantidade deve estar entre 1 e 12 Chromebooks.'
        );
    }

    /*
     * Converte IDs para número
     */
    const idUsuarioNumero = Number(idUsuario);
    const turmaIdNumero = Number(turmaId);
    const aulaNumero = Number(aula);

    /*
     * Verificação no JavaScript antes de tentar inserir.
     *
     * A proteção definitiva também existe no banco através
     * do índice UNIQUE.
     */
    const reservaExistente =
        await buscarReservaDoProfessor(
            idUsuarioNumero,
            data,
            aulaNumero
        );

    if (reservaExistente) {
        throw new Error(
            'Este professor já possui uma reserva para este horário.'
        );
    }

    /*
     * Inserção no Supabase
     */
    const {
        data: novaReserva,
        error
    } = await supabase
        .from('reservas')
        .insert({
            data_reserva: data,

            data_criacao:
                new Date().toISOString(),

            aula:
                aulaNumero,

            quantidade:
                quantidade,

            carregado:
                false,

            id_turma:
                turmaIdNumero,

            id_usuario:
                idUsuarioNumero
        })
        .select(CAMPOS_RESERVA)
        .single();

    /*
     * Tratamento de erro
     */
    if (error) {

        console.error(
            'Erro ao criar reserva:',
            error
        );

        /*
         * 23505 = violação de UNIQUE
         *
         * Isso protege contra situações em que duas operações
         * tentem criar a mesma reserva simultaneamente.
         */
        if (error.code === '23505') {
            throw new Error(
                'Este professor já possui uma reserva para este horário.'
            );
        }

        throw new Error(
            'Erro ao salvar reserva: ' +
            error.message
        );
    }

    return novaReserva;
}


/*
|--------------------------------------------------------------------------
| EDITAR RESERVA
|--------------------------------------------------------------------------
|
| O professor pode editar sua própria reserva.
| O Master pode editar qualquer reserva.
|
| A autorização é feita no app.js e também deverá ser protegida
| pelas políticas RLS do Supabase.
|
*/

export async function editarReserva({
    reservaId,
    data,
    aula,
    quantidade,
    turmaId,
    idUsuario
}) {

    /*
     * Valida ID da reserva
     */
    if (
        reservaId === undefined ||
        reservaId === null ||
        reservaId === ''
    ) {
        throw new Error(
            'A reserva não foi informada.'
        );
    }

    /*
     * Valida data
     */
    if (!data) {
        throw new Error(
            'Selecione a data da reserva.'
        );
    }

    /*
     * Valida aula
     */
    if (
        aula === undefined ||
        aula === null ||
        aula === ''
    ) {
        throw new Error(
            'Selecione o horário da reserva.'
        );
    }

    /*
     * Valida turma
     */
    if (
        turmaId === undefined ||
        turmaId === null ||
        turmaId === ''
    ) {
        throw new Error(
            'Selecione a turma.'
        );
    }

    /*
     * Valida professor
     */
    if (
        idUsuario === undefined ||
        idUsuario === null ||
        idUsuario === ''
    ) {
        throw new Error(
            'O professor não foi informado.'
        );
    }

    quantidade = Number(quantidade);

    /*
     * Quantidade entre 1 e 12
     */
    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > 12
    ) {
        throw new Error(
            'A quantidade deve estar entre 1 e 12 Chromebooks.'
        );
    }

    const reservaIdNumero =
        Number(reservaId);

    const aulaNumero =
        Number(aula);

    const turmaIdNumero =
        Number(turmaId);

    const idUsuarioNumero =
        Number(idUsuario);

    /*
     * Verifica se existe outra reserva do mesmo professor
     * na mesma data e aula.
     *
     * A própria reserva que está sendo editada é ignorada.
     */
    const reservaExistente =
        await buscarReservaDoProfessor(
            idUsuarioNumero,
            data,
            aulaNumero,
            reservaIdNumero
        );

    if (reservaExistente) {
        throw new Error(
            'Este professor já possui outra reserva para este horário.'
        );
    }

    /*
     * Atualiza a reserva
     */
    const {
        data: reservaAtualizada,
        error
    } = await supabase
        .from('reservas')
        .update({
            data_reserva:
                data,

            aula:
                aulaNumero,

            quantidade:
                quantidade,

            id_turma:
                turmaIdNumero,

            id_usuario:
                idUsuarioNumero
        })
        .eq('id', reservaIdNumero)
        .select(CAMPOS_RESERVA)
        .single();

    if (error) {

        console.error(
            'Erro ao editar reserva:',
            error
        );

        /*
         * Violação do índice UNIQUE
         */
        if (error.code === '23505') {
            throw new Error(
                'Este professor já possui uma reserva para este horário.'
            );
        }

        throw new Error(
            'Erro ao atualizar reserva: ' +
            error.message
        );
    }

    return reservaAtualizada;
}


/*
|--------------------------------------------------------------------------
| EXCLUIR RESERVA
|--------------------------------------------------------------------------
|
| Somente o perfil Master deve chamar esta função.
|
| A função também verifica o usuário autenticado antes
| de executar a exclusão.
|
*/

export async function excluirReserva(
    reservaId,
    usuarioAtual
) {

    if (
        reservaId === undefined ||
        reservaId === null ||
        reservaId === ''
    ) {
        throw new Error(
            'A reserva não foi informada.'
        );
    }

    /*
     * Verificação do usuário
     */
    if (!usuarioAtual) {
        throw new Error(
            'Usuário não autenticado.'
        );
    }

    /*
     * Somente Master pode excluir.
     */
    if (!usuarioAtual.usuario_master) {
        throw new Error(
            'Somente usuários Master podem excluir reservas.'
        );
    }

    const idReservaNumero =
        Number(reservaId);

    /*
     * Exclui a reserva
     */
    const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', idReservaNumero);

    if (error) {

        console.error(
            'Erro ao excluir reserva:',
            error
        );

        throw new Error(
            'Erro ao excluir reserva: ' +
            error.message
        );
    }

    return true;
}


/*
|--------------------------------------------------------------------------
| BUSCAR UMA RESERVA PELO ID
|--------------------------------------------------------------------------
|
| Útil para edição e outras operações.
|
*/

export async function buscarReservaPorId(
    reservaId
) {

    if (
        reservaId === undefined ||
        reservaId === null ||
        reservaId === ''
    ) {
        throw new Error(
            'O ID da reserva não foi informado.'
        );
    }

    const { data: reserva, error } =
        await supabase
            .from('reservas')
            .select(CAMPOS_RESERVA)
            .eq('id', Number(reservaId))
            .single();

    if (error) {

        console.error(
            'Erro ao buscar reserva:',
            error
        );

        throw new Error(
            'Erro ao buscar reserva: ' +
            error.message
        );
    }

    return reserva;
}


/*
|--------------------------------------------------------------------------
| ALTERAR STATUS "CARREGADO"
|--------------------------------------------------------------------------
|
| Permite marcar se a reserva foi carregada/separada.
|
| Esta função fica separada para não misturar a regra
| de reserva com a regra operacional.
|
*/

export async function alterarStatusCarregado(
    reservaId,
    carregado
) {

    if (
        reservaId === undefined ||
        reservaId === null ||
        reservaId === ''
    ) {
        throw new Error(
            'A reserva não foi informada.'
        );
    }

    const { data: reservaAtualizada, error } =
        await supabase
            .from('reservas')
            .update({
                carregado:
                    Boolean(carregado)
            })
            .eq('id', Number(reservaId))
            .select(CAMPOS_RESERVA)
            .single();

    if (error) {

        console.error(
            'Erro ao alterar status da reserva:',
            error
        );

        throw new Error(
            'Erro ao alterar status da reserva: ' +
            error.message
        );
    }

    return reservaAtualizada;
}


/*
|--------------------------------------------------------------------------
| EXPORTAÇÃO AUXILIAR
|--------------------------------------------------------------------------
|
| Permite verificar rapidamente se uma data está no formato
| esperado pelo PostgreSQL.
|
*/

export function validarDataReserva(data) {

    if (!data) {
        return false;
    }

    /*
     * Formato esperado:
     * YYYY-MM-DD
     */
    const regex =
        /^\d{4}-\d{2}-\d{2}$/;

    return regex.test(data);}