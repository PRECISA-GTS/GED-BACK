const db = require('../../../config/db');
const { hasPending, deleteItem } = require('../../../config/defaultConfig');

class FormulariosController {
    getList(req, res) {
        db.query(`
        SELECT 
            pf.parFormularioID AS id, 
            pf.nome
        FROM par_formulario AS pf`, (err, result) => {
            if (err) {
                res.status(500).json(err);
            } else {
                res.status(200).json(result);
            }
        })
    }

}

module.exports = FormulariosController;