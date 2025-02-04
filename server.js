require('dotenv').config(); // Carregar variáveis de ambiente do arquivo .env

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const fsp = require('fs').promises; // Usa o módulo de promessas do fs
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Biblioteca para upload de arquivos
const selfsigned = require('selfsigned'); // Biblioteca para gerar certificados autoassinados
const htmlObfuscator = require('html-obfuscator');

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
  const certPath = '/etc/letsencrypt/live/planecon.xyz-0003/fullchain.pem';
  const keyPath = '/etc/letsencrypt/live/planecon.xyz-0003/privkey.pem';

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log("Usando certificado Let’s Encrypt.");
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } else {
    console.log("Certificado Let’s Encrypt não encontrado. Gerando certificado autoassinado.");
    const sslOptions = generateSelfSignedCerts();
    return {
      key: sslOptions.key,
      cert: sslOptions.cert
    };
  }
}

// Lógica para renomear pastas de acordo com OBFUSCATE_HTML
const jsPath = path.join(__dirname, 'public', 'js');
const jsObfuscatedPath = path.join(__dirname, 'public', 'js_obfuscated');
const jsNotObfuscatedPath = path.join(__dirname, 'public', 'js_not_obfuscated');

if (OBFUSCATE_HTML) {

  console.log('Obfuscating HTML.');

  if (fs.existsSync(jsObfuscatedPath)) {
    if (fs.existsSync(jsPath)) {
      fs.renameSync(jsPath, jsNotObfuscatedPath);
    }
    fs.renameSync(jsObfuscatedPath, jsPath);
  }
} else {

  console.log('Not obfuscating HTML.');

  if (fs.existsSync(jsNotObfuscatedPath)) {
    if (fs.existsSync(jsPath)) {
      fs.renameSync(jsPath, jsObfuscatedPath);
    }
    fs.renameSync(jsNotObfuscatedPath, jsPath);
  }
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

app.use((req, res, next) => {
  if (OBFUSCATE_HTML && req.url === '/') {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) return next(err);
      
      //const modifiedHtml = data.replace(/src=["']js\//g, 'src="js_obfuscated/');
      const obfuscatedHTML = htmlObfuscator.obfuscate(data);
      
      res.type('text/html').send(obfuscatedHTML);
    });
  } else {
    next();
  }
});

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