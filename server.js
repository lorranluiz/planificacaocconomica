const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const fsp = require('fs').promises; // Usa o módulo de promessas do fs
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Biblioteca para upload de arquivos
const selfsigned = require('selfsigned'); // Biblioteca para gerar certificados autoassinados
const hostname = '0.0.0.0';
const PRODUCTION_DOMAIN = 'planecon.xyz';

// Função para determinar se está rodando em localhost
function isLocalEnvironment(req) {
  const host = req.get('host') || '';
  return !host.includes(PRODUCTION_DOMAIN) && 
         (host.includes('localhost') || 
          host.includes('127.0.0.1') ||
          process.env.NODE_ENV === 'development');
}

// Função para gerar certificados autoassinados
function generateSelfSignedCerts() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { keySize: 2048, days: 365 });
  return {
    key: pems.private,
    cert: pems.cert
  };
}

// Função para obter as opções SSL
function getSSLOptions() {
  const sslOptions = generateSelfSignedCerts();
  return {
    key: sslOptions.key,
    cert: sslOptions.cert
  };
}

const app = express();

// Aumenta o limite do body-parser para o app principal
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Middleware para subrota
const jsonServerApp = express();
jsonServerApp.use(cors());

// Aumenta o limite também para o jsonServerApp
jsonServerApp.use(express.json({limit: '50mb'}));
jsonServerApp.use(express.urlencoded({limit: '50mb', extended: true}));

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

// Rota para baixar arquivos
app.get('/download', (req, res) => {
    try {
        const filePath = path.join('.', req.query.path || '').replace(/\\/g, '/');

        // Verifica se o arquivo existe antes de tentar baixá-lo
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }

        res.download(filePath, (err) => {
            if (err) {
                console.error('Erro ao fazer download:', err);
                res.status(500).json({ error: 'Erro ao baixar o arquivo.' });
            }
        });
    } catch (err) {
        console.error('Erro no servidor:', err);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// Rota para fazer upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
  const uploadPath = path.join('.', req.body.path || '/', req.file.originalname);
  fs.rename(req.file.path, uploadPath, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save file' });
    res.json({ success: true });
  });
});

// Criar servidor HTTP para redirecionar para HTTPS
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://planecon.xyz${req.url}` });
  res.end();
});

// Criar servidor HTTPS na porta 443
const httpsServer = https.createServer(getSSLOptions(), app);

// Iniciar o servidor HTTP na porta 80 para redirecionar para HTTPS
httpServer.listen(80, hostname, () => {
  console.log(`Servidor HTTP redirecionando para HTTPS em http://${hostname}`);
});

// Iniciar o servidor HTTPS na porta 443
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
