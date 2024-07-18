const path = require('path');
const fs = require('fs');

const save = (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const targetPath = path.join(__dirname, '../../uploads/teste', file.filename);

  fs.rename(file.path, targetPath, err => {
    if (err) return res.status(500).send('Error saving file.');
    res.status(200).send('File saved successfully.');
  });
};

module.exports = save;
