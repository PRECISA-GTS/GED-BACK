const db = require('../../../config/db');
const { hasPending, deleteItem } = require('../../../config/defaultConfig');

class FormulariosController {
    async getList(req, res) {
        const sql = `
        SELECT 
            pf.parFormularioID AS id, 
            pf.nome,
            pf.tabela,
            pf.rota
        FROM par_formulario AS pf`
        const [result] = await db.promise().query(sql)

        // menu pra obter o icone baseado na rota
        const sqlMenu = `
        SELECT icone, rota
        FROM menu
        WHERE rota LIKE "%/formularios%"`
        const [resultMenu] = await db.promise().query(sqlMenu)

        for (const item of result) {
            const module = item.tabela.split('_')[0] + '_' + item.tabela.split('_')[1]
            item.module = module

            // Obtém o total de formulários/modelos
            const sql = `
            SELECT COUNT(*) AS qtd
            FROM ${item.tabela}_modelo
            WHERE unidadeID = ?`
            const [resultCount] = await db.promise().query(sql, [1])
            item.total = resultCount[0]['qtd']
        }
        for (const item of resultMenu) {
            const module = item.rota.split('/')[2]
            item.module = module ?? ''
        }

        // Agrupa por módulo
        let arrModules = []
        for (const item of result) {
            const index = arrModules.findIndex(modulo => modulo.module === item.module)

            if (index > -1) {
                arrModules[index].forms.push(item)
            } else {
                const module = item.rota.split('/')[3]
                const icon = resultMenu.find(menu => menu.module === module)?.icone
                const result = {
                    module: item.module,
                    icon,
                    forms: [item]
                }
                arrModules.push(result)
            }
        }

        return res.status(200).json(arrModules)
    }
}

module.exports = FormulariosController;