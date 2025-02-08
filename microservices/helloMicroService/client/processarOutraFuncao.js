//cliJsMicroservice
//Javascript que chama a rota que, lá no servidor, vai executar o python do microsserviço, e pega seu retorno para usar aqui na página do usuário

//Adicionar eventos que dispararam as chamadas dos microserviços Python no servidor (se quiser fazer aqui, separado, mas talvez dê pra fazer direto no código, onde for necessário, com naturalidade, só chamando, como se fosse uma função no próprio código js)
document.getElementById('processarOutraFuncao').addEventListener('click', processarOutraFuncao);

//Espelho das funções do microsservice no servidor (ou dos arquivos .py que executam cada função no diretório do microservice no servidor)
function processarOutraFuncao() {

    // /microservices é o middlewere no server.js que chama o arquivo /microservices/microServicesRouters.js que contém o resto da rota que veio depois de /microservices
    fetch('microservices/helloMicroService/bridge/processarOutraFuncao')
        .then(response => response.json())
        .then(data => {

            callbackProcessarOutraFuncao(data);

        })
        .catch(error => {
            console.error('Erro:', error);
        });
}

function callbackProcessarOutraFuncao(data) {
    //Lógica no lado do cliente que executa algo com o resultado do processamento feito no lado do servidor, pelo microserviço python
    //Nesse caso, o dado retornado da função processarEExibirHelloWorld() do microsserviço python helloMicroService

    //Isso aqui está rodando no app.js do cliente (o javascript principal que roda e engloba todo o resto, no cliente)

    //alert(data.message);

    const microserviceCanvaArea = document.getElementById('microserviceCanvaArea');
                    
    //console.info("data.imageBase64");
    //console.log(data.imageBase64);

    // Criar o elemento <img> e definir a imagem base64 como src
    const imgElement = document.createElement('img');
    imgElement.src = `data:image/png;base64,${data.imageBase64}`;
    imgElement.alt = "Gráfico Gerado";
    imgElement.style.maxWidth = "100%";
    
    // Limpar qualquer imagem anterior e adicionar a nova
    microserviceCanvaArea.innerHTML = '';
    microserviceCanvaArea.appendChild(imgElement);

}