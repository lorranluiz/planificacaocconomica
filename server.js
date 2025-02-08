require('dotenv').config(); // Carregar variáveis de ambiente do arquivo .env


const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Biblioteca para upload de arquivos
const microservicesRouters = require('./microservices/microServicesRouters.js'); // Importando as rotas dos microsserviços python
const { loadSecureEnvironment, manageObfuscatedFoldersAndFiles, getSSLOptions } = require('./public/js/secure/secure.js');

loadSecureEnvironment(path, fs);

const hostname = process.env.HOSTNAME || '0.0.0.0';
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 'planecon.xyz';
const OBFUSCATE_HTML = process.env.OBFUSCATE_HTML === 'true';

// Função para determinar se está rodando em localhost
function isLocalEnvironment(req) {
  const host = req.get('host') || '';
  return !host.includes(PRODUCTION_DOMAIN) && 
         (host.includes('localhost') || 
          host.includes('127.0.0.1') ||
          process.env.NODE_ENV === 'development');
}

const app = express();

//Gerenciamento de ofuscamento de código no navegador
manageObfuscatedFoldersAndFiles(app, OBFUSCATE_HTML)

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

// Middleware para usar as rotas dos microsserviços python
app.use('/microservices', microservicesRouters);

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

// Rota para servir arquivos estáticos da pasta "data/images"
app.use('/data/images', express.static(path.join(__dirname, 'data', 'images')));

app.use('/microservices/helloMicroService/client', express.static('microservices/helloMicroService/client'));

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


