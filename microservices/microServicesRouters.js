const express = require('express');
const microservicesRouter = express.Router();

// Register graficoTrabalhadoresAmazonas microservice routes
const graficoTrabalhadoresAmazonas = require('./services/graficoTrabalhadoresAmazonas/index');
graficoTrabalhadoresAmazonas.routes.forEach(route => {
  microservicesRouter[route.method || 'get'](route.path, route.handler);
});

module.exports = microservicesRouter;
