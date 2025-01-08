const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Biblioteca para upload de arquivos
const hostname = '0.0.0.0';

const app = express();

// Middleware para subrota
const jsonServerApp = express();
jsonServerApp.use(cors());
jsonServerApp.use(express.json({ limit: '1000mb' }));

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rotas do jsonServerApp
jsonServerApp.get('/data', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'data.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao ler o arquivo JSON' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao processar os dados JSON' });
    }
  });
});

jsonServerApp.put('/data', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'data.json');
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'Dados não fornecidos no corpo da requisição' });
  }
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao salvar o arquivo JSON' });
    }
    res.status(200).json({ message: 'Dados salvos com sucesso!' });
  });
});

// Montar o servidor JSON em uma subrota
app.use('/jsonServer', jsonServerApp);

// Middleware para uploads
const upload = multer({ dest: 'uploads/' });

// Rota para listar arquivos e pastas
app.get('/files', (req, res) => {
  const basePath = path.resolve('.');
  const dirPath = path.join(basePath, req.query.path || '/');
  fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list files' });
    res.json({
      path: req.query.path || '/',
      files: files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory()
      }))
    });
  });
});

// Rota para baixar arquivos
app.get('/download', (req, res) => {
  const filePath = path.resolve('.', req.query.path || '');
  res.download(filePath);
});

// Rota para fazer upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
  const uploadPath = path.join('.', req.body.path || '/', req.file.originalname);
  fs.rename(req.file.path, uploadPath, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save file' });
    res.json({ success: true });
  });
});

// Criar servidores HTTP e HTTPS
const httpServer = http.createServer(app);
const httpsServer = https.createServer({
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem')
}, app);

// Iniciar o servidor
httpServer.listen(80, hostname, () => {
  console.log(`Servidor HTTP rodando em http://${hostname}`);
});

httpsServer.listen(443, hostname, () => {
  console.log(`Servidor HTTPS rodando em https://${hostname}`);
});

process.on('uncaughtException', (err) => {
  console.error('Erro não tratado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejeição não tratada:', promise, 'Motivo:', reason);
});

app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

httpServer.on('error', (err) => {
  console.error('Erro no servidor HTTP:', err);
});

httpsServer.on('error', (err) => {
  console.error('Erro no servidor HTTPS:', err);
});
