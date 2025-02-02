const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const fsp = require('fs').promises; // Usa o módulo de promessas do fs
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Biblioteca para upload de arquivos
const selfsigned = require('selfsigned'); // Adicione esta linha
const hostname = '0.0.0.0';
const PRODUCTION_DOMAIN = 'planecon.xyz';

// Função para gerar certificados auto-assinados
function generateSelfSignedCerts() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, {
    algorithm: 'sha256',
    days: 30,
    keySize: 2048,
  });
  return {
    key: pems.private,
    cert: pems.cert
  };
}

// Função para determinar se está rodando em localhost
function isLocalEnvironment(req) {
  const host = req.get('host') || '';
  return !host.includes(PRODUCTION_DOMAIN) && 
         (host.includes('localhost') || 
          host.includes('127.0.0.1') || 
          process.env.NODE_ENV === 'development');
}

// Configure as opções SSL de forma dinâmica
let productionSSL = null;
try {
  productionSSL = {
    key: fs.readFileSync(path.join(__dirname, 'cert.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'chain.pem')),
  };
} catch (error) {
  console.log('Certificados de produção não encontrados, usando apenas certificados locais');
}

// Middleware para escolher o certificado baseado na requisição
const getSSLOptions = (req) => {
  if (isLocalEnvironment(req)) {
    return generateSelfSignedCerts();
  }
  return productionSSL;
};

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

// Rota para deletar arquivos
app.post('/delete', async (req, res) => {
    try {
        const { path: dirPath, name } = req.body;

        // Valida se os parâmetros foram fornecidos
        if (!dirPath || !name) {
            return res.status(400).json({ error: 'Parâmetros inválidos: path ou name ausentes.' });
        }

        // Constrói o caminho relativo correto
        const filePath = path.join('.', dirPath, name).replace(/\\/g, '/');

        // Verifica se o arquivo existe
        await fsp.access(filePath);

        // Remove o arquivo
        await fsp.unlink(filePath);

        res.status(200).json({ message: 'Arquivo deletado com sucesso.' });
    } catch (err) {
        console.error('Erro ao deletar arquivo:', err);

        if (err.code === 'ENOENT') {
            // Arquivo não encontrado
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }

        res.status(500).json({ error: 'Erro ao deletar arquivo.' });
    }
});


// Criar servidores HTTP e HTTPS com certificados dinâmicos
const httpServer = http.createServer(app);
const httpsServer = https.createServer((req, socket, head) => {
  const sslOptions = getSSLOptions(req);
  const secureServer = https.createServer(sslOptions, app);
  secureServer.emit('connection', socket);
  socket.on('data', (data) => {
    secureServer.emit('connection', socket);
  });
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
