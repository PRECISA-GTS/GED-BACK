const db = require('../../config/db');

const generate = async (req, res) => {

  const result = {
    name: 'Jonatan'
  }

  res.json(result)
}

module.exports = generate