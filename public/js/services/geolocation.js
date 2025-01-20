// Função para obter a localização apenas uma vez
function getUserLocation() {
    if (!navigator.geolocation) {
        // Caso o navegador não suporte geolocalização
        userCity = "Geolocalização não suportada";
        return;
    }

    // Solicitar localização do navegador apenas uma vez
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;

            // Obter cidade com geocodificação reversa
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                .then(response => response.json())
                .then(data => {
                    userCity = data.address.city || data.address.town || data.address.village || "Localização desconhecida";
                })
                .catch(() => {
                    userCity = "Localização não disponível";
                });
        },
        () => {
            // Caso o usuário negue a permissão
            userCity = "Permissão negada";
        }
    );
}

// Inicializa a localização (chamada única)
getUserLocation();

// Atualiza a barra continuamente para exibir a hora atualizada
function updateInfoBar() {
    fetchLocationAndUpdateInfoBar();
}

let userLocation = null; // Variável para armazenar a localização do usuário
	let userCity = "Localização não disponível"; // Cidade padrão para fallback

	// Função para atualizar o conteúdo da barra com hora e localização
	function fetchLocationAndUpdateInfoBar() {
		const infoText = document.getElementById('infoText');
		const now = new Date();
		const locale = 'pt-BR';

		// Formatar a data e hora
		const dia = now.getDate();
		const mes = now.toLocaleString(locale, { month: 'long' });
		const ano = now.getFullYear();
		const horas = now.getHours().toString().padStart(2, '0');
		const minutos = now.getMinutes().toString().padStart(2, '0');
		const segundos = now.getSeconds().toString().padStart(2, '0');

		 // Determinar o título com base no pronome
		let title = '';

		// Atualizar a barra com os dados do conselho e hora local
		if (userIsLoggedIn) {
		
			const username = document.getElementById('username').value;
			const password = document.getElementById('password').value;
			if(null == user){
				user = users.find(u => u.username === username && u.password === password);
			}
		
			if (user.instancePrepositionJurisdictionUUID.includes("WorkerUUID")) {
				//É trabalhador que não é conselheiro
				
				if (user.pronoun === 'feminino') {
					title = 'Trabalhadora';
				} else if (user.pronoun === 'masculino') {
					title = 'Trabalhador';
				} else {
					title = 'Trabalhadore';
				}				
				
				infoText.innerHTML = `${title} ${user.name}, ${dia} de ${mes} de ${ano}, ${horas}:${minutos}:${segundos} <button id="logoutButton" onclick="logout()">Sair</button>`;
			}
			else {
				//É conselheiro
				
				if (user.pronoun === 'feminino') {
					title = 'Conselheira';
				} else if (user.pronoun === 'masculino') {
					title = 'Conselheiro';
				} else {
					title = 'Conselheire';
				}
				
				infoText.innerHTML = `${title} ${user.name}, ${user.instance} ${user.preposition} ${user.jurisdiction}, ${dia} de ${mes} de ${ano}, ${horas}:${minutos}:${segundos} <button id="logoutButton" onclick="logout()">Sair</button>`;
			}
		} else {
			// Caso não tenha dados completos, mostrar apenas o texto com a hora e localização
			infoText.innerHTML = `<button id="loginButton" onclick="showLoginSection()">Faça Login</button> ${dia} de ${mes} de ${ano}, ${horas}:${minutos}:${segundos}`;
		}
	}

	// Inicializa a barra e atualiza a hora
	setInterval(updateInfoBar, 1000);
	updateInfoBar();