const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const cors = require('cors');
const hostname = '0.0.0.0';

const app = express();

const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'lit.org' }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048, // Define o tamanho da chave como 2048 bits
});


require('fs').writeFileSync('key.pem', pems.private);
require('fs').writeFileSync('cert.pem', pems.cert);
console.log('Certificados gerados!');

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

// Criar servidores HTTP e HTTPS
const httpServer = http.createServer(app);
const httpsServer = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
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

