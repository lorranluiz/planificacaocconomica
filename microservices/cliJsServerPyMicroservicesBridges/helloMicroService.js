//cliJsServerPyMicroserviceBridge
// Javascript que executa o python do microsserviço e apenas passa a resposta diretamente para o Javascript do cliente, que vai usar a resposta para algo na página do usuário

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
        
        const result = JSON.parse(stdout);

        if (result.imageBase64) {
          // Retorna a imagem no formato JSON para o cliente
          res.json({ imageBase64: result.imageBase64 });
      } else {
          res.status(500).send('Imagem não encontrada');
      }


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