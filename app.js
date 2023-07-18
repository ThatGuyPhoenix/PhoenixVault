const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const upload = multer({ dest: 'uploads/' });
const path = require('path');

function generateEncryptionKey() {
  const length = 16; // Length of the encryption key in bytes
  const key = crypto.randomBytes(length).toString('hex');
  return key;
}

function encryptFile(fileBuffer, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  return encrypted;
}

function decryptFile(fileBuffer, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  const decrypted = Buffer.concat([decipher.update(fileBuffer), decipher.final()]);
  return decrypted;
}

app.use(express.static('public'));

app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const filePath = file.path;
  const originalFileName = file.originalname;

  const fileData = fs.readFileSync(filePath);

  const key = generateEncryptionKey();
  const encryptedData = encryptFile(fileData, key);

  fs.unlinkSync(filePath);

  const encryptedFileName = `${originalFileName.replace(/\.[^/.]+$/, '')}_encrypted${path.extname(originalFileName)}`;
  fs.writeFileSync(`uploads/${encryptedFileName}`, encryptedData);

  res.send(`File uploaded and encrypted successfully! Encryption key: ${key}`);
});

app.post('/api/decrypt', upload.single('file'), (req, res) => {
  const file = req.file;
  const filePath = file.path;
  const key = req.body.key;

  if (!key) {
    return res.status(400).send('Decryption key is missing.');
  }

  const fileData = fs.readFileSync(filePath);
  const decryptedData = decryptFile(fileData, key);

  fs.unlinkSync(filePath);

  const decryptedFileName = `${file.filename}_decrypted`;
  fs.writeFileSync(`uploads/${decryptedFileName}`, decryptedData);

  res.download(`uploads/${decryptedFileName}`, () => {
    fs.unlinkSync(`uploads/${decryptedFileName}`);
  });
});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});