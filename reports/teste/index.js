const db = require('../../config/db');

const teste = async (req, res) => {
  console.log("helloooo")

  const result = {
    name: 'Jonatan'
  }

  res.json(result)
}

module.exports = teste