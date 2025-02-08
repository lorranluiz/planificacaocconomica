// Event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    const hello1Button = document.getElementById('hello1-button');
    const hello2Button = document.getElementById('hello2-button');

    hello1Button?.addEventListener('click', async () => {
        try {
            const response = await fetch('/microservices/hello/processarEExibirHelloWorld');
            const data = await response.json();
            
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

        } catch (error) {
            console.error('Error:', error);
        }
    });

    hello2Button?.addEventListener('click', async () => {
        try {
            const response = await fetch('/microservices/hello/processarEExibirHelloWorld2');
            
            const data = await response.json();
            
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


        } catch (error) {
            console.error('Error:', error);
        }
    });
});