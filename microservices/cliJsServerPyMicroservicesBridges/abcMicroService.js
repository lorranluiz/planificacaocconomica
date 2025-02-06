const { exec } = require('child_process');

function abcProcessarEExibirHelloWorld(req, res) {

    console.log("4 Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");

    exec('python ./microservices/py/abcMicroService/abcProcessarEExibirHelloWorld.py', (error, stdout, stderr) => {
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

  function abcProcessarEExibirHelloWorld2(req, res) {

    console.log("4 Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");

    exec('python ./microservices/py/abcMicroService/abcProcessarEExibirHelloWorld2.py', (error, stdout, stderr) => {
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
  
  module.exports = { abcProcessarEExibirHelloWorld, abcProcessarEExibirHelloWorld2 }; // Exporta as funções desse microsserviço