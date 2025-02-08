const { exec } = require('child_process');

class HelloMicroService {

  //#region Estabelecer Rotas da Funções
  constructor() {
    
    // Cada Rota corresponde a uma função desse microsserviço, por exemplo: funcao1Route -> funcao1, funcao2Route -> funcao2

    //#region Estabelecer Rotas das Funções

    //Rota da função processarEExibirHelloWorld() deste microsserviço
    this.processarEExibirHelloWorldRoute = {
      routePath: '/helloMicroService/processarEExibirHelloWorld',
      callback: (req, res) => {
        const microservicesBridges = require('./microservicesBridges.js');
        microservicesBridges.helloMicroService.processarEExibirHelloWorld(req, res);
      }
    };

    //Rota da função processarEExibirHelloWorld2() deste microsserviço
    this.processarEExibirHelloWorld2Route = {
      routePath: '/helloMicroService/processarEExibirHelloWorld2', 
      callback: (req, res) => {
        const microservicesBridges = require('./microservicesBridges.js');
        microservicesBridges.helloMicroService.processarEExibirHelloWorld2(req, res);
      }
    };

    //#endregion

  }
  //#endregion

  //#region Funções desse Microserviço

  processarEExibirHelloWorld(req, res) {
    exec('python ./microservices/py/helloMicroService/processarEExibirHelloWorld.py', (error, stdout, stderr) => {
        
        //Tratamento de erros ocorridos durante execução do script python
        if (error) {
        console.error(`Erro ao executar o script Python: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao executar o script Python' });
        }
        if (stderr) {
        console.error(`Erro no script Python: ${stderr}`);
        return res.status(500).json({ message: 'Erro no script Python' });
        }
        
        //Não houve erro na execução do script python
        //Recomenda-se que se use sempre formato json pra transferencia de todo tipo de informação (imagem (gráficos), texto, números, tabelas, matrizes, vetores, etc)
        const result = JSON.parse(stdout);

        //Tratamento e envio da resposta do script python
        //Cada microserviço pode tratar e retornar um tipo de resposta diferente, para o fim para o qual será usado no javascript do cliente que fez a requisição

        if (result.imageBase64) {
          // Retorna a imagem no formato JSON para o cliente
          res.json({ imageBase64: result.imageBase64 });
      } else {
          res.status(500).send('Imagem não encontrada');
      }


    });
  }

  processarEExibirHelloWorld2(req, res) {
    exec('python ./microservices/py/helloMicroService/processarEExibirHelloWorld2.py', (error, stdout, stderr) => {
        
        //Tratamento de erros ocorridos durante execução do script python
        if (error) {
        console.error(`Erro ao executar o script Python: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao executar o script Python' });
        }
        if (stderr) {
        console.error(`Erro no script Python: ${stderr}`);
        return res.status(500).json({ message: 'Erro no script Python' });
        }
        
        //Não houve erro na execução do script python
        //Recomenda-se que se use sempre formato json pra transferencia de todo tipo de informação (imagem (gráficos), texto, números, tabelas, matrizes, vetores, etc)
        const result = JSON.parse(stdout);

        //Tratamento e envio da resposta do script python
        //Cada microserviço pode tratar e retornar um tipo de resposta diferente, para o fim para o qual será usado no javascript do cliente que fez a requisição

        if (result.imageBase64) {
          // Retorna a imagem no formato JSON para o cliente
          res.json({ imageBase64: result.imageBase64 });
      } else {
          res.status(500).send('Imagem não encontrada');
      }


    });
  }

  //#endregion

}

// Criar instância desse microsserviçi e exportá-lo
module.exports = new HelloMicroService();