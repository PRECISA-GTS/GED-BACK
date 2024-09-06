const db = require('../config/db');
const { executeQuery } = require('../config/executeQuery');
require('dotenv/config')

//? Cria agendamento no calendário na conclusão do formulário, na data de vencimento do formulário 
//? initialDate: yyyy-mm-dd
const createScheduling = async (id, type, name, subtitle, initialDate, cycle, unityID) => {
    let calendar = null
    if (!cycle || cycle == '0') return

    switch (type) {
        case 'fornecedor':
            calendar = {
                type: 'Fornecedor',
                route: '/formularios/fornecedor',
            }
            break;
        case 'recebimentomp-naoconformidade':
            calendar = {
                type: 'Não Conformidade do Recebimento de MP',
                route: '/formularios/recebimento-mp/?aba=nao-conformidade',
                routePermission: '/formularios/recebimento-mp' //? NC está na rota do recebimento, então seta essa rota pra validação das permissões de acesso 
            }
            break;
        case 'limpeza':
            calendar = {
                type: 'Limpeza',
                route: '/formularios/limpeza',
            }
            break;
        default:
            calendar = {
                type: 'Desconhecido',
                route: '/',
            }
            break;
    }

    const sqlCalendar = `INSERT INTO calendario(titulo, subtitulo, tipo, dataHora, rota, rotaPermissao, rotaID, origemID, status, unidadeID) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    await db.promise().query(sqlCalendar, [
        name,
        subtitle,
        calendar.type,
        getVencimento(initialDate, cycle),
        calendar.route,
        calendar.routePermission ?? calendar.route,
        '0',
        id,
        '0',
        unityID
    ])
}

const deleteScheduling = async (type, id, unityID, logID) => {
    let route = ''
    switch (type) {
        case 'fornecedor':
            route = '/formularios/fornecedor'
            break;
        case 'recebimentomp-naoconformidade':
            route = '/formularios/recebimento-mp/?aba=nao-conformidade'
            break;
        case 'limpeza':
            route = '/formularios/limpeza'
            break;
        default:
            route = '/'
            break;
    }

    const sqlDeleteScheduling = `DELETE FROM calendario WHERE unidadeID = ? AND origemID = ? AND rota = ?`
    await executeQuery(sqlDeleteScheduling, [unityID, id, route], 'delete', 'calendario', 'origemID', id, logID)
}

const getVencimento = (initialDate, ciclo) => {
    const date = new Date(initialDate);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + parseInt(ciclo));
    const vencimentoFormatado = date.toISOString().slice(0, 10) + ' 00:00:00';
    return vencimentoFormatado;
}

module.exports = {
    createScheduling,
    deleteScheduling,
};