const db = require('../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../config/executeQuery');

class CalendarioController {
    async getEvents(req, res) {
        try {
            const { unidadeID, usuarioID, papelID } = req.body

            if (!unidadeID || !usuarioID || !papelID) {
                return res.status(500).json({ message: 'Parâmetros incorretos!' })
            }

            const sql = `
            SELECT c.*
            FROM calendario AS c
                JOIN permissao AS p ON (c.rota = p.rota)
            WHERE c.unidadeID = ? AND p.usuarioID = ? AND p.papelID = ? AND p.unidadeID = ? AND p.ler = ?`
            const [resultCalendar] = await db.promise().query(sql, [unidadeID, usuarioID, papelID, unidadeID, 1])

            const result = resultCalendar.map(item => {
                return {
                    id: item.calendarioID,
                    title: item.titulo,
                    start: item.dataHora,
                    end: item.dataHora,
                    type: item.tipo,
                    variant: 'info',
                    color: hexToRgb('#26C6F9'),
                    url: `${item.rota}/${item.rotaID}`
                }
            })

            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

}

// Transforma o hex em rgba como alpha de 0.2
const hexToRgb = (hex, alpha = 0.2) => {
    hex = hex.replace(/^#/, '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

module.exports = CalendarioController;