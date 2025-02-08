const { exec } = require('child_process');
const path = require('path');

class HelloServiceHandler {
    constructor() {
        this.scriptsPath = path.join(__dirname, '..', 'python', 'scripts');
        
        // Bind methods to preserve 'this' context
        this.processarEExibirHelloWorld = this.processarEExibirHelloWorld.bind(this);
        this.processarEExibirHelloWorld2 = this.processarEExibirHelloWorld2.bind(this);
    }

    processarEExibirHelloWorld(req, res) {
        exec(`python ${path.join(this.scriptsPath, 'helloWorld.py')}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                return res.status(500).json({ error: error.message });
            }
            res.json(JSON.parse(stdout));
        });
    }

    processarEExibirHelloWorld2(req, res) {
        exec(`python ${path.join(this.scriptsPath, 'helloWorld2.py')}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                return res.status(500).json({ error: error.message });
            }
            res.json(JSON.parse(stdout));
        });
    }
}

// Create and export a single instance
const handler = new HelloServiceHandler();
module.exports = handler;