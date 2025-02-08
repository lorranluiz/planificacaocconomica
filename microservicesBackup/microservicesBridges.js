const { exec } = require('child_process');

//Herdar cada um dos arquivos microsserviços.js
const helloMicroService = require('./helloMicroService/bridge.js'); //Importa todas as funções dentro desse microsserviço
//Se funcionar, depois herdar o abcMicroService e ver se funciona

module.exports = { helloMicroService }; // Exporta as funções desse microsserviço

