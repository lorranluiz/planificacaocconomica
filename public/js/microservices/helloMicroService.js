//Adicionar eventos que dispararam as chamadas dos microserviços Python no servidor (se quiser fazer aqui, separado, mas talvez dê pra fazer direto no código, onde for necessário, com naturalidade, só chamando, como se fosse uma função no próprio código js)
document.getElementById('pythonButton').addEventListener('click', processarEExibirHelloWorld);

//Espelho das funções do microsservice no servidor (ou dos arquivos .py que executam cada função no diretório do microservice no servidor)
function processarEExibirHelloWorld() {

    // /microservices é o middlewere no server.js que chama o arquivo /routers/microServicesRouters.js que contém o resto da rota que veio depois de /microservices
    fetch('/microservices/helloMicroService/processarEExibirHelloWorld')
        .then(response => response.json())
        .then(data => {

            callbackSuccessProcessarEExibirHelloWorld(data);

        })
        .catch(error => {
            console.error('Erro:', error);
        });
}

function callbackSuccessProcessarEExibirHelloWorld(data) {
    //Lógica no lado do cliente que executa algo com o resultado do processamento feito no lado do servidor, pelo microserviço python
    //Nesse caso, o dado retornado da função processarEExibirHelloWorld() do microsserviço python helloMicroService

    //Isso aqui está rodando no app.js do cliente (o javascript principal que roda e engloba todo o resto, no cliente)

    alert(data.message);

}