const fsp = require('fs').promises; // Usa o módulo de promessas do fs
const selfsigned = require('selfsigned'); // Biblioteca para gerar certificados autoassinados
const htmlObfuscator = require('html-obfuscator');
const dirname = process.cwd();

let path = null;
let fs = null;

function loadSecureEnvironment(pathParam, fsParam){
    path = pathParam;
    fs = fsParam;
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

function manageObfuscatedFoldersAndFiles(app, OBFUSCATE_HTML) {
  const jsPath = path.join(dirname, 'public', 'js');
  const jsObfuscatedPath = path.join(dirname, 'public', 'js_obfuscated');
  const jsNotObfuscatedPath = path.join(dirname, 'public', 'js_not_obfuscated');

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

  app.use((req, res, next) => {
    if (OBFUSCATE_HTML && req.url === '/') {
      const htmlPath = path.join(dirname, 'public', 'index.html');
      fs.readFile(htmlPath, 'utf8', (err, data) => {
        if (err) return next(err);

        const obfuscatedHTML = htmlObfuscator.obfuscate(data);
        res.type('text/html').send(obfuscatedHTML);
      });
    } else {
      next();
    }
  });
}

// Exportando as funções
module.exports = {
  loadSecureEnvironment,
  manageObfuscatedFoldersAndFiles,
  getSSLOptions,
};