const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { exec } = require('child_process');

const sourceDir = path.join(__dirname, 'public', 'js');
const outputDir = path.join(__dirname, 'public', 'js_obfuscated');

// Função para garantir que o diretório existe
function ensureDirectoryExistence(dir) {
    if (!fs.existsSync(dir)) {
        //Se p diretório não existe, ele é criado aqui
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

function createEmptyObfuscatedFilesDirectory(){
    //Apaga um direto antigo, caso exista
    if (fs.existsSync(outputDir)) {
        //Se existe, ele é apagado, para que seja criado um novo
        fs.rmSync(outputDir, { recursive: true, force: true });
    }

    ensureDirectoryExistence(outputDir); //Cria o novo diretório
}

// Garantir que o diretório de saída exista esteja vazio antes de processar
console.log('Creating obfuscated files...');
createEmptyObfuscatedFilesDirectory();
processFilesRecursively(sourceDir, outputDir);

// Instalar dependências dos microsserviços python do servidor (depois ver um gerenciador de dependências para gerenciar e instalar automaticamente as dependências python do projeto)
exec('pip install matplotlib', (error, stdout, stderr) => {
    if (error) {
        console.error(`Erro ao executar o comando: ${error.message}`);
        return;
    }

    if (stderr) {
        console.error(`Erro: ${stderr}`);
        return;
    }

    console.log(`Resultado: ${stdout}`);
});