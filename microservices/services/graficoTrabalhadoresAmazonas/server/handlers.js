const { exec } = require('child_process');
const path = require('path');

class Handlers {
    constructor() {
        this.scriptsPath = path.join(__dirname, '..', 'python', 'scripts');
        
        // Bind methods to preserve 'this' context
        this.analisarEGerarGraficoTrabalhadoresAmazonas = this.analisarEGerarGraficoTrabalhadoresAmazonas.bind(this);
        //Inserior mais funções como a linha aqui acima, se necessário
    }

    analisarEGerarGraficoTrabalhadoresAmazonas(req, res) {
        exec(`python ${path.join(this.scriptsPath, 'analisarEGerarGraficoTrabalhadoresAmazonas.py')}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                return res.status(500).json({ error: error.message });
            }
            res.json(JSON.parse(stdout));
        });
    }

    //Inserir mais funções como a função acima, se necessário

}

// Create and export a single instance
const handlers = new Handlers();
module.exports = handlers;