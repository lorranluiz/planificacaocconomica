function processarEExibirHelloWorld(callback) {
    exec('python3 ./microservices/py/helloMicroService/processarEExibirHelloWorld.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar o script Python: ${error.message}`);
        return callback({ message: 'Erro ao executar o script Python' });
      }
      if (stderr) {
        console.error(`Erro no script Python: ${stderr}`);
        return callback({ message: 'Erro no script Python' });
      }
      //Retorna o resultado da execução do microsserviço python no servidor
      callback(null, { message: stdout.trim() });
    });
  }

function processarEExibirHelloWorld2(callback) {
    exec('python3 ./microservices/py/helloMicroService/processarEExibirHelloWorld2.py', (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro ao executar o script Python: ${error.message}`);
          return callback({ message: 'Erro ao executar o script Python' });
        }
        if (stderr) {
          console.error(`Erro no script Python: ${stderr}`);
          return callback({ message: 'Erro no script Python' });
        }
        callback(null, { message: stdout.trim() });
      });
}
  
  module.exports = { processarEExibirHelloWorld, processarEExibirHelloWorld2 }; // Exporta as funções desse microsserviço