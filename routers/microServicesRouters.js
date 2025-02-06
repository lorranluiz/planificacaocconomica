const express = require('express');
const microservicesRouter = express.Router();
const microservices = require('../microservices/js/microservices.js');

// Rota para executar o script Python e retornar a mensagem
microservicesRouter.get('/helloMicroService/processarEExibirHelloWorld', (req, res) => {

    console.log("3 Chamou execução do microsserviço Python helloMicroService/processarEExibirHelloWorld.py");
    
    microservices.helloMicroService.processarEExibirHelloWorld(req, res);
    
  });

module.exports = microservicesRouter;
