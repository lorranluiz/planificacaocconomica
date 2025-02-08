const express = require('express');
const microservicesRouter = express.Router();
const microservicesBridges = require('../microservices/microservicesBridges.js');

let helloMicroService = microservicesBridges.helloMicroService;

// Adiciona rota do microsserviço helloMicroService
microservicesRouter.get(helloMicroService.processarEExibirHelloWorldRoute.routePath, helloMicroService.processarEExibirHelloWorldRoute.callback);
microservicesRouter.get(helloMicroService.processarEExibirHelloWorld2Route.routePath, helloMicroService.processarEExibirHelloWorld2Route.callback);

module.exports = microservicesRouter;
