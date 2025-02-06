const { exec } = require('child_process');

function processarEExibirHelloWorld(req, res) {

    console.log("4 Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");

    exec('python ./microservices/py/helloMicroService/processarEExibirHelloWorld.py', (error, stdout, stderr) => {
        if (error) {
        console.error(`Erro ao executar o script Python: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao executar o script Python' });
        }
        if (stderr) {
        console.error(`Erro no script Python: ${stderr}`);
        return res.status(500).json({ message: 'Erro no script Python' });
        }
        res.status(200).json({ message: stdout });
    });

  }

  function processarEExibirHelloWorld2(req, res) {

    console.log("4 Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");

    exec('python ./microservices/py/helloMicroService/processarEExibirHelloWorld2.py', (error, stdout, stderr) => {
        if (error) {
        console.error(`Erro ao executar o script Python: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao executar o script Python' });
        }
        if (stderr) {
        console.error(`Erro no script Python: ${stderr}`);
        return res.status(500).json({ message: 'Erro no script Python' });
        }
        res.status(200).json({ message: stdout });
    });

  }
  
  module.exports = { processarEExibirHelloWorld, processarEExibirHelloWorld2 }; // Exporta as funções desse microsserviço