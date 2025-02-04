const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const sourceDir = path.join(__dirname, 'public', 'js');
const outputDir = path.join(__dirname, 'public', 'js_obfuscated');

// Função para garantir que o diretório existe
function ensureDirectoryExistence(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Função para processar arquivos recursivamente
function processFilesRecursively(source, destination) {
    fs.readdirSync(source, { withFileTypes: true }).forEach(entry => {
        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            ensureDirectoryExistence(destinationPath);
            processFilesRecursively(sourcePath, destinationPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            fs.readFile(sourcePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Erro ao ler ${sourcePath}:`, err);
                    return;
                }

                try {
                    const obfuscationResult = JavaScriptObfuscator.obfuscate(data, {
                        compact: true,
                        stringArray: true,
                        stringArrayEncoding: ['rc4'],
                        stringArrayThreshold: 0.75
                    });

                    fs.writeFile(destinationPath, obfuscationResult.getObfuscatedCode(), 'utf8', err => {
                        if (err) {
                            console.error(`Erro ao salvar ${destinationPath}:`, err);
                        } else {
                            console.log(`Arquivo ofuscado salvo: ${destinationPath}`);
                        }
                    });
                } catch (error) {
                    console.error(`Erro ao ofuscar ${sourcePath}:`, error);
                }
            });
        }
    });
}

// Garantir que o diretório de saída existe antes de processar
ensureDirectoryExistence(outputDir);
processFilesRecursively(sourceDir, outputDir);
