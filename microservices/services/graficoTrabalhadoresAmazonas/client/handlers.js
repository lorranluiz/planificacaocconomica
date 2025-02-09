// Event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    const analisarEGerarGraficoTrabalhadoresAmazonasButton = document.getElementById('analisarEGerarGraficoTrabalhadoresAmazonasButton');

    analisarEGerarGraficoTrabalhadoresAmazonasButton?.addEventListener('click', async () => {
        try {

            const microservicesCanvaArea = document.getElementById('microservicesCanvaArea');
            const microservicesLoadingMsg = document.getElementById('microservicesLoadingMsg');
            
            microservicesLoadingMsg.innerHTML = 'Processando análise de dados, aguarde um instante... <br>&nbsp;<br><p><img src="images/loadingAnimated.gif" alt="Loading" style="width: 2em; height: 2em;"></p>';

            const response = await fetch('/microservices/graficoTrabalhadoresAmazonas/analisarEGerarGraficoTrabalhadoresAmazonas');
            const data = await response.json();

            // Criar o elemento <img> e definir a imagem base64 como src
            const imgElement = document.createElement('img');
            imgElement.src = `data:image/png;base64,${data.imageBase64}`;
            imgElement.alt = "Gráfico Gerado";
            imgElement.style.maxWidth = "100%";
            
            // Limpar qualquer imagem anterior e adicionar a nova
            microservicesCanvaArea.innerHTML = '';
            microservicesLoadingMsg.innerHTML = '';
            showNotification("Analise de dados realizada com sucesso!", true)
            microservicesCanvaArea.appendChild(imgElement);

        } catch (error) {
            console.error('Error:', error);
        }
    });

    //Inserir mais funções como a anterior, se necessário
});