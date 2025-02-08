const express = require('express');
const microservicesRouter = express.Router();
const helloService = require('./services/hello/index'); // Changed from microServicesIndex to index

// Register hello service routes
helloService.routes.forEach(route => {
  microservicesRouter[route.method || 'get'](route.path, route.handler);
});

module.exports = microservicesRouter;
