const express = require('express');
const router = express.Router();
const microservices = require('../microservices/js/microservices.js');

// Rota para executar o script Python e retornar a mensagem
router.get('/helloMicroService/processarEExibirHelloWorld', (req, res) => {
    console.log("Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");
    
    microservices.helloMicroService.processarEExibirHelloWorld((error, result) => {
        // Função de callback que será chamada após a execução do microsserviço, apenas para retornar o resultado para a função no js do cliente que faz a chamada
        if (error) {
          return res.status(500).json(error);
        }

        //Retorna para o cliente o resultado do processamento do microsserviço python no servidor
        console.log('Microsserviço Executado com Sucesso!!! Resultado retornado do processamento do microsseriço python no servidor: ', result);
        res.json(result);

    });
    
  });

module.exports = router;
