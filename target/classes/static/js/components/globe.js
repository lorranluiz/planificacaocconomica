let scene, camera, renderer, globe, marker, label;

function initSmallGlobe() {
    // Seleciona o contêiner para a animação
    const globeContainer = document.getElementById('globeContainer');

    // Configurações iniciais da cena
    const scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true }); // Fundo transparente
    renderer.setSize(300, 300); // Tamanho fixo do globo
    globeContainer.appendChild(renderer.domElement);

     // Adiciona a esfera da Terra
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('./images/earthTexture.jpg');
    
    
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture });
    earthMaterial.transparent = true;
    earthMaterial.opacity = 0.8;
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);

    // Corrige a orientação da textura
    //earth.rotation.x = Math.PI; // Gira 180 graus para alinhar corretamente


    // Ajuste manual da rotação
    //earth.rotation.y = THREE.MathUtils.degToRad(80); // Corrigir longitude

    scene.add(earth);

    // Adiciona iluminação
    const ambientLight = new THREE.AmbientLight(0xff0000, 2);
    scene.add(ambientLight);

    // Aqui adicionamos a luz vermelha
    const redLight = new THREE.PointLight(0xffbbbb, 1);
    redLight.position.set(50, 30, 50);
    scene.add(redLight);

    // Configura a posição inicial da câmera
    camera.position.z = 3;

    // Adiciona o marcador vermelho para a localização do usuário
    navigator.geolocation.getCurrentPosition(function (position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        let ajusteManualDeLongitude = -99; //Ajuste para calibração da Longitude do Marcador, em graus

        // Converter latitude e longitude para coordenadas 3D
        const phi = (90 - latitude) * (Math.PI / 180); // Latitude
        const theta = (longitude + 180 + ajusteManualDeLongitude) * (Math.PI / 180); // Longitude

const loader = new THREE.TextureLoader();
const globeRadius = 1; // Substitua pelo raio real do globo (exemplo: 1 para THREE.SphereGeometry(1, ...))
const displacement = 0.1; // Ajuste o deslocamento para fora do globo

loader.load('./images/animatedRedFlag.gif', function (texture) {
    // Criar a geometria da bandeira (um plano)
    const planeGeometry = new THREE.PlaneGeometry(0.2, 0.2); // Ajuste o tamanho da bandeira
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide // Garante que a bandeira seja visível dos dois lados
    });
    marker = new THREE.Mesh(planeGeometry, planeMaterial); // Armazena na variável global

    // Posicionar a bandeira fora do globo
    marker.position.set(
        (Math.sin(phi) * Math.cos(theta)) * (globeRadius + displacement),
        (Math.cos(phi)) * (globeRadius + displacement),
        (Math.sin(phi) * Math.sin(theta)) * (globeRadius + displacement)
    );

    // Vetor que aponta para o centro do globo
    const center = new THREE.Vector3(0, 0, 0);
    const directionToCenter = center.clone().sub(marker.position).normalize();

    // Alinhar a bandeira com a superfície
    const upVector = new THREE.Vector3(0, -1, 0); // Vetor "para cima" da bandeira
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, directionToCenter);
    marker.setRotationFromQuaternion(quaternion);
    

    // Adicionar a bandeira ao globo
    earth.add(marker);
});





        // Usar a API de Geocodificação Reversa para obter o nome da cidade
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`;

        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                // Tenta diferentes campos para o nome da cidade
                const city = data.address.city || data.address.town || data.address.village || "Cidade desconhecida";
                const state = data.address.state || data.address.region;
                const country = data.address.country;

                // Criar um rótulo HTML para a localização no globo
                label = document.createElement('div');
                label.innerHTML = `${city}, <br>${state}, <br>${country}`;
                label.style.position = 'absolute';
                label.style.fontSize = '12px';
                label.style.fontWeight = 'bold';
                label.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'; // Fundo branco transparente
                label.style.color = '#8B0000'; // Texto vermelho escuro
                label.style.padding = '5px 10px'; // Espaçamento interno
                label.style.borderRadius = '5px'; // Bordas arredondadas
                label.style.textAlign = 'center'; // Centraliza o texto horizontalmente
                label.style.pointerEvents = 'none'; // Evita que o rótulo interfira com interações do globo
                label.style.transform = 'translateX(-50%)'; // Centraliza o rótulo

                // Posicionar o rótulo em cima do ponteiro (marcador)
                globeContainer.appendChild(label);
                
                globeContainer.style.visibility = 'visible';
                
                // Função para atualizar a posição do rótulo com base na rotação
                function updateLabelPosition() {
                    const vector = new THREE.Vector3();
                    const canvasBounds = renderer.domElement.getBoundingClientRect();

                    // Posição da bandeira no mundo 3D
                    vector.setFromMatrixPosition(marker.matrixWorld);

                    // Converte a posição 3D para 2D (tela)
                    vector.project(camera);

                    // Converte para coordenadas de pixel no canvas
                    const x = (vector.x * 0.5 + 0.5) * canvasBounds.width;
                    const y = (1 - (vector.y * 0.5 + 0.5)) * canvasBounds.height;

                    // Posiciona o rótulo acima da bandeira (ajuste "y" para subir um pouco)
                    label.style.left = `${x}px`;
                    label.style.top = `${y - 100}px`; // Move o rótulo um pouco para cima
                    
                    //console.info('vector.z'+vector.z);
                    
                    if (vector.z < 0.94) {
                        label.style.display = 'block'; // Mostra o HTML quando a bandeira está à frente
                    } else {
                        label.style.display = 'none'; // Oculta o HTML quando a bandeira está atrás
                    }
                    
                }

                // Função para converter coordenadas 3D para coordenadas da tela
                function getScreenPosition(position, camera, renderer) {
                    const vector = position.clone().project(camera);
                    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.width;
                    const y = (vector.y * -0.5 + 0.5) * renderer.domElement.height;
                    return { x, y };
                }

                // Atualiza a posição do rótulo durante a animação
                function animate() {
                    requestAnimationFrame(animate);
                     // Atualize a posição do rótulo
                    updateLabelPosition();
                }

                animate();
            })
            .catch(error => {
                console.error('Erro ao obter o nome da cidade:', error);
            });
    }, function (error) {
        console.error('Erro ao obter localização:', error);
    });

    // Função de animação
    function animate() {
        requestAnimationFrame(animate);
        earth.rotation.y += 0.001; // Velocidade de rotação
        
        renderer.render(scene, camera);
    }

    animate();
}

function toggleHTMLVisibility(htmlElement, object, camera) {
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector); // Obtém a posição da bandeira no mundo
    vector.project(camera); // Projeta a posição para a tela

    if (vector.z > 0) {
        htmlElement.style.display = 'block'; // Mostra o HTML quando a bandeira está à frente
    } else {
        htmlElement.style.display = 'none'; // Oculta o HTML quando a bandeira está atrás
    }
}

