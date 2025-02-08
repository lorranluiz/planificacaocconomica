const express = require('express');
const microservicesRouter = express.Router();
const microservicesBridges = require('./microservicesBridges.js');

let helloMicroService = microservicesBridges.helloMicroService;

// Adiciona rota do microsserviço helloMicroService

//microservicesRouter.use('/microservices/helloMicroService/client', express.static('microservices/helloMicroService/client'));

microservicesRouter.get(helloMicroService.processarEExibirHelloWorldRoute.routePath, helloMicroService.processarEExibirHelloWorldRoute.callback);
microservicesRouter.get(helloMicroService.processarOutraFuncaoRoute.routePath, helloMicroService.processarOutraFuncaoRoute.callback);

module.exports = microservicesRouter;
