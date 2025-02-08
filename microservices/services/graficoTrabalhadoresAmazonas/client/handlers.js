// Event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    const analisarEGerarGraficoTrabalhadoresAmazonasButton = document.getElementById('analisarEGerarGraficoTrabalhadoresAmazonasButton');

    analisarEGerarGraficoTrabalhadoresAmazonasButton?.addEventListener('click', async () => {
        try {
            const response = await fetch('/microservices/graficoTrabalhadoresAmazonas/analisarEGerarGraficoTrabalhadoresAmazonas');
            const data = await response.json();
            
            const microserviceCanvaArea = document.getElementById('microserviceCanvaArea');

            // Criar o elemento <img> e definir a imagem base64 como src
            const imgElement = document.createElement('img');
            imgElement.src = `data:image/png;base64,${data.imageBase64}`;
            imgElement.alt = "Gráfico Gerado";
            imgElement.style.maxWidth = "100%";
            
            // Limpar qualquer imagem anterior e adicionar a nova
            microserviceCanvaArea.innerHTML = '';
            microserviceCanvaArea.appendChild(imgElement);

        } catch (error) {
            console.error('Error:', error);
        }
    });

    //Inserir mais funções como a anterior, se necessário
});