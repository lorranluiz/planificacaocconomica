function abcProcessarEExibirHelloWorld(callback) {
    exec('python3 ./microservices/py/abcMicroService/abcProcessarEExibirHelloWorld.py', (error, stdout, stderr) => {
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

function abcProcessarEExibirHelloWorld2(callback) {
    exec('python3 ./microservices/py/abcMicroService/abcProcessarEExibirHelloWorld2.py', (error, stdout, stderr) => {
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
  
  module.exports = { abcProcessarEExibirHelloWorld, abcProcessarEExibirHelloWorld2 }; // Exporta as funções desse microsserviço