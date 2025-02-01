// Importando utils
document.write('<script src="js/utils/uuid.js"></script>');
document.write('<script src="js/utils/translations.js"></script>');
document.write('<script src="js/utils/qrcode.js"></script>');

// Importando services
document.write('<script src="js/services/auth.js"></script>');
document.write('<script src="js/services/api.js"></script>');
document.write('<script src="js/services/geolocation.js"></script>');
document.write('<script src="js/services/csv.js"></script>');

// Importando components
document.write('<script src="js/components/globe.js"></script>');
document.write('<script src="js/components/modal.js"></script>');
document.write('<script src="js/components/table.js"></script>');
document.write('<script src="js/components/forms.js"></script>');
document.write('<script src="js/components/notifications.js"></script>');
document.write('<script src="js/components/buttons.js"></script>');

// Importando models
document.write('<script src="js/models/economy.js"></script>');

let userIsLoggedIn = false;
			let user = null;
			let primeiroConselheiroDoConselho = true;
			// Variáveis globais para armazenar os dados antigos
			let previousTableData = [];
			let previousProductNames = [];
			let previousSectorNames = [];
			let previousDemandValues = [];
			let propostaDados = {};
			let councilData = null;
			let modalContext = null;
			let conselhoMundialKey = "Conselho Popular Intercontinental da Terra";
			let totalSocialWork = 0;
            let worldSectorNames = [];
			let totalSocialWorkDessaJurisdicao = 0;
			let effectivelyPlannedProductionTime = 0;
			
		
			const productNames = [
				"Automóveis", "Computadores", "Celulares", "Geladeiras", "Televisores",
				"Roupas de algodão", "Embalagens plásticas", "Móveis de madeira", "Aço",
				"Vidro", "Produtos de limpeza", "Tintas", "Cosméticos", "Borracha",
				"Medicamentos", "Papel", "Embalagens de alumínio", "Fertilizantes",
				"Peças automotivas", "Componentes eletrônicos"
			];

			const inputNames = [
				"Aço", "Plástico", "Alumínio", "Madeira", "Vidro", "Algodão", "Borracha",
				"Produtos químicos", "Cobre", "Tinta", "Polímeros", "Petróleo", "Sílica",
				"Borracha sintética", "Lítio", "Carbonato de cálcio", "Petróleo refinado",
				"Bioetanol", "Minério de ferro", "Celulose"
			];

			const predefinedValues = [
				[0.2, 0.1, 0.05, 0.02, 0.05, 0.1, 0.02, 0.1, 0.08, 0.1, 0.02, 0.05, 0.02, 0.08, 0.05, 0.04, 0.02, 0.02, 0.05, 0.05],
				[0.05, 0.2, 0.08, 0.1, 0.03, 0.05, 0.1, 0.02, 0.07, 0.05, 0.1, 0.03, 0.05, 0.08, 0.1, 0.02, 0.04, 0.02, 0.07, 0.04],
				[0.03, 0.1, 0.2, 0.02, 0.08, 0.07, 0.02, 0.05, 0.1, 0.05, 0.04, 0.02, 0.07, 0.1, 0.02, 0.08, 0.05, 0.05, 0.02, 0.08],
				[0.08, 0.05, 0.02, 0.2, 0.05, 0.1, 0.05, 0.07, 0.02, 0.1, 0.08, 0.03, 0.02, 0.05, 0.04, 0.1, 0.05, 0.1, 0.02, 0.07],
				[0.1, 0.02, 0.05, 0.03, 0.2, 0.05, 0.1, 0.02, 0.07, 0.05, 0.1, 0.04, 0.05, 0.03, 0.1, 0.08, 0.05, 0.1, 0.07, 0.02],
				[0.05, 0.1, 0.02, 0.08, 0.03, 0.2, 0.07, 0.05, 0.1, 0.04, 0.05, 0.1, 0.02, 0.1, 0.05, 0.08, 0.05, 0.03, 0.1, 0.04],
				[0.07, 0.02, 0.05, 0.1, 0.05, 0.1, 0.2, 0.03, 0.02, 0.07, 0.08, 0.05, 0.1, 0.02, 0.05, 0.07, 0.1, 0.04, 0.08, 0.05],
				[0.02, 0.05, 0.1, 0.05, 0.07, 0.03, 0.1, 0.2, 0.08, 0.05, 0.03, 0.08, 0.02, 0.1, 0.05, 0.1, 0.07, 0.05, 0.02, 0.04],
				[0.05, 0.1, 0.02, 0.1, 0.04, 0.05, 0.07, 0.05, 0.2, 0.08, 0.1, 0.02, 0.05, 0.1, 0.05, 0.04, 0.08, 0.07, 0.02, 0.1],
				[0.1, 0.05, 0.07, 0.05, 0.08, 0.1, 0.03, 0.1, 0.05, 0.2, 0.05, 0.07, 0.04, 0.1, 0.03, 0.05, 0.1, 0.04, 0.07, 0.08],
				[0.02, 0.07, 0.05, 0.04, 0.1, 0.08, 0.05, 0.1, 0.1, 0.03, 0.2, 0.02, 0.07, 0.05, 0.1, 0.04, 0.08, 0.05, 0.1, 0.02],
				[0.05, 0.1, 0.08, 0.02, 0.04, 0.05, 0.1, 0.03, 0.1, 0.07, 0.02, 0.2, 0.08, 0.05, 0.04, 0.05, 0.1, 0.1, 0.03, 0.07],
				[0.03, 0.05, 0.1, 0.08, 0.1, 0.02, 0.07, 0.05, 0.05, 0.04, 0.1, 0.07, 0.2, 0.02, 0.05, 0.05, 0.08, 0.1, 0.04, 0.05],
				[0.1, 0.05, 0.03, 0.07, 0.05, 0.1, 0.02, 0.05, 0.1, 0.05, 0.1, 0.08, 0.04, 0.2, 0.07, 0.02, 0.05, 0.05, 0.1, 0.03],
				[0.05, 0.1, 0.02, 0.05, 0.08, 0.1, 0.07, 0.1, 0.03, 0.1, 0.05, 0.04, 0.05, 0.08, 0.2, 0.05, 0.1, 0.03, 0.07, 0.02],
				[0.04, 0.05, 0.1, 0.05, 0.02, 0.07, 0.08, 0.1, 0.05, 0.04, 0.08, 0.1, 0.03, 0.05, 0.07, 0.2, 0.1, 0.02, 0.05, 0.05],
				[0.05, 0.08, 0.02, 0.1, 0.07, 0.04, 0.05, 0.03, 0.05, 0.07, 0.1, 0.1, 0.02, 0.1, 0.04, 0.05, 0.2, 0.1, 0.07, 0.03],
				[0.03, 0.07, 0.05, 0.05, 0.1, 0.02, 0.1, 0.04, 0.08, 0.1, 0.05, 0.1, 0.02, 0.07, 0.05, 0.08, 0.03, 0.2, 0.05, 0.1],
				[0.07, 0.05, 0.04, 0.1, 0.05, 0.02, 0.08, 0.05, 0.1, 0.1, 0.03, 0.05, 0.05, 0.04, 0.1, 0.07, 0.02, 0.05, 0.2, 0.08],
				[0.05, 0.03, 0.1, 0.04, 0.07, 0.05, 0.08, 0.1, 0.02, 0.05, 0.1, 0.05, 0.07, 0.08, 0.02, 0.1, 0.03, 0.07, 0.08, 0.2]
			];
		
			let currentProductIndex = null;
			let optimizationInputs = {};  // Objeto para armazenar os dados de entrada de otimização de cada produto
			let optimizationResults = {};

			let optimizedStatus = {};  // Objeto para armazenar o status de otimização de cada produto


	

	// Chama a função populateInitialTable() ao carregar a página
	window.onload = function() {
		populateInitialTable(); // Carrega a tabela inicial
		document.getElementById('welcomeModal').style.display = 'flex'; // Exibe o modal de boas-vindas
		togglePlanificationElements();  // Garante que os elementos estejam ocultos no carregamento
		
		try {
			document.getElementById('fetchDataButton').click();
		} catch (error) {
			console.error("Erro ao executar 'Receber Dados':", error);
		}
		
		showNotification("Olá, Trabalhador! Faça login e dirija a economia planificada mundial!", true);
		
		initSmallGlobe();
		
	}

	document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					
					 closeAllModals();
					
				}
				
				if (event.ctrlKey && event.key === 'Enter') {
					event.preventDefault(); // Impede ações padrão, se houver
					planify(); // Chama a função de planificação
				}
				
				 if (event.ctrlKey) {
					// Filtra apenas as combinações específicas configuradas no programa
					if (event.key === 'd' || event.key === 'D') {
						event.preventDefault(); // Impede a ação padrão apenas para CTRL+S
						const downloadButton = document.getElementById('downloadDataButton');
						if (downloadButton) {
							downloadButton.click();
						}
					} else if (event.key === 'o' || event.key === 'O') {
						event.preventDefault(); // Impede a ação padrão apenas para CTRL+O
						const uploadButton = document.getElementById('uploadDataButton');
						if (uploadButton) {
							uploadButton.click();
						}
					} else if (event.key === 's' || event.key === 'S') {
						event.preventDefault(); // Impede o comportamento padrão do navegador (salvar página)
						
						if (userIsLoggedIn) { // Verifica se o usuário está logado
							const sendButton = document.getElementById('sendDataButton');
							if (sendButton) {
								sendButton.click(); // Simula o clique no botão "Enviar Dados"
							}
						} else {
							showNotification("Você precisa estar logado para poder salvar suas alterações", false);
						}
					} else if (event.key === 'Backspace') {
						event.preventDefault(); // Evita a ação padrão do navegador
						confirmClearTable(); // Chama a função de confirmação antes de limpar
					} else if (event.ctrlKey && (event.key === 'e' || event.key === 'E')) {
						if (userIsLoggedIn) { // Verifica se o usuário está logado
							event.preventDefault(); // Impede o comportamento padrão
							logout(); // Simula o clique no botão "Sair"
						}
						// Se o usuário não estiver logado, o comportamento padrão é mantido
					} else if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
						event.preventDefault(); // Previne o comportamento padrão
						if (!userIsLoggedIn) { // Verifica se o usuário não está logado
							showLoginSection();
						}
					}
		
				}
			});

	function saveOptimizationInputs() {
		const workerLimit = parseFloat(document.getElementById('workerLimit').value);
		const workerHours = parseFloat(document.getElementById('workerHours').value);
		const productionTime = parseFloat(document.getElementById('productionTime').value);
		const nightShift = document.getElementById('nightShift').checked;
		const weeklyScale = parseInt(document.getElementById('weeklyScale').value);

		// Verificação dos campos obrigatórios
		if (
			isNaN(workerLimit) ||
			isNaN(workerHours) ||
			isNaN(productionTime) ||
			isNaN(weeklyScale) ||
			weeklyScale < 1 ||
			weeklyScale > 7
		) {
			showNotification("Por favor, preencha todos os campos corretamente. A escala semanal deve estar entre 1 e 7 dias.", false);
			return;
		}

		// Limitar a carga horária diária a no máximo 12 horas
		if (workerHours > 12) {
			showNotification("A carga horária diária não pode ser maior do que 12 horas.", false);
			return;
		}

		// Salva os dados no objeto de otimização
		if (!optimizationInputs[currentProductIndex]) {
			optimizationInputs[currentProductIndex] = {}; // Inicializa se não existir
		}

		optimizationInputs[currentProductIndex] = {
			workerLimit,
			workerHours,
			productionTime,
			nightShift,
			weeklyScale
		};

	// Atualiza os botões de otimização
		updateOptimizeButtonColor(currentProductIndex);
		closeOptimizationModal();	

		optimizedStatus[currentProductIndex] = true; // Marca o produto como otimizado
		updateOptimizeButtonColor(currentProductIndex); // Atualiza a cor do botão

		closeOptimizationModal(); // Fecha o modal após salvar

		// Verifica se a tabela de "Planificação Otimizada" está visível e executa a função "planify" automaticamente
		//const resultDiv = document.getElementById('result');
		//if (resultDiv && resultDiv.innerHTML.trim() !== '') {
		//	planify();
		//}
		
		
		
	}

	// Função para armazenar os valores antigos da demanda final
	function storePreviousDemandValues() {
		const demandInputs = document.querySelectorAll('#finalDemandInputs input[type="number"]');
		previousDemandValues = Array.from(demandInputs).map(input => input.value || 0);
	}

	// Função para atualizar a tabela de demanda final
	function updateFinalDemand(numRows) {
		const demandContainer = document.getElementById('finalDemandInputs');
		demandContainer.innerHTML = '';

		for (let i = 0; i < numRows; i++) {
			const demandRow = document.createElement('tr');

			// Nome do produto sincronizado com a tabela
			const productNameCell = document.createElement('td');
			productNameCell.textContent = previousProductNames[i] || `Produto ${i + 1}`;
			demandRow.appendChild(productNameCell);

			// Entrada de demanda (preserva valor existente ou padrão)
			const demandInputCell = document.createElement('td');
			const demandInput = document.createElement('input');
			demandInput.type = 'number';
			demandInput.id = `demand${i}`;
			demandInput.value = previousDemandValues[i] || (i === 0 ? 1 : 0);
			demandInputCell.appendChild(demandInput);
			demandRow.appendChild(demandInputCell);

			// Botão de otimização
			const buttonCell = document.createElement('td');
			const button = document.createElement('button');
			button.textContent = 'Otimizar';
			button.onclick = () => openOptimizationModal(i);
			buttonCell.appendChild(button);
			demandRow.appendChild(buttonCell);

			demandContainer.appendChild(demandRow);

			// Atualizar a cor do botão com base no status de otimização
			updateOptimizeButtonColor(i);
		}
	}

	// Função para atualizar a tabela de demanda final
	function updateFinalDemand(numRows) {
		const demandContainer = document.getElementById('finalDemandInputs');
		demandContainer.innerHTML = '';

		for (let i = 0; i < numRows; i++) {
			const demandRow = document.createElement('tr');

			// Nome do produto sincronizado com a tabela
			const productNameCell = document.createElement('td');
			productNameCell.textContent = previousProductNames[i] || `Produto ${i + 1}`;
			demandRow.appendChild(productNameCell);

			// Entrada de demanda (preserva valor existente ou padrão)
			const demandInputCell = document.createElement('td');
			const demandInput = document.createElement('input');
			demandInput.type = 'number';
			demandInput.id = `demand${i}`;
			demandInput.value = previousDemandValues[i] !== undefined ? previousDemandValues[i] : (i === 0 ? 1 : 0);
			demandInputCell.appendChild(demandInput);
			demandRow.appendChild(demandInputCell);

			// Botão de otimização
			const buttonCell = document.createElement('td');
			const button = document.createElement('button');
			button.textContent = 'Otimizar';
			button.onclick = () => openOptimizationModal(i);
			buttonCell.appendChild(button);
			demandRow.appendChild(buttonCell);

			demandContainer.appendChild(demandRow);

			// Atualizar a cor do botão com base no status de otimização
			updateOptimizeButtonColor(i);
		}
	}

	function togglePlanificationElements() {
		const planificationTitle = document.getElementById('planificationTitle');
		const copyableButton = document.getElementById('openCopyableDataModal');
		const downloadButton = document.getElementById('downloadDataButton');

		if (isPlanified) {
			planificationTitle.style.display = 'block';  // Exibe o título
			copyableButton.style.display = 'block';      // Exibe o botão "Dados copiáveis"
			downloadButton.style.display = 'block';      // Exibe o botão "Baixar Dados"
		} else {
			planificationTitle.style.display = 'none';   // Oculta o título
			copyableButton.style.display = 'none';       // Oculta o botão "Dados copiáveis"
			downloadButton.style.display = 'none';       // Oculta o botão "Baixar Dados"
		}
	}


	function updateOptimizeButtonColor(productIndex) {
				const button = document.querySelector(`#finalDemandInputs tr:nth-child(${productIndex + 1}) button`);
				const inputs = optimizationInputs[productIndex];

				// Verifica se todos os campos obrigatórios estão preenchidos
				const isComplete = inputs && 
					inputs.workerLimit > 0 && 
					inputs.workerHours > 0 &&
					inputs.productionTime > 0 &&
					inputs.weeklyScale > 0;

				if (isComplete) {
					button.style.backgroundColor = 'green'; // Dados completos, botão fica verde
				} else {
					button.style.backgroundColor = '';     // Reseta a cor do botão
				}
			}


	// Função para acionar "Salvar" ao pressionar Enter
	function handleEnterPress(event) {
		if (event.key === 'Enter') {
			event.preventDefault(); // Impede o comportamento padrão do Enter
			saveOptimizationInputs();
			document.removeEventListener('keydown', handleEnterPress); // Remove o ouvinte após salvar
		}
	}


	function handleEnter(event) {
		if (event.key === "Enter") {
			event.preventDefault(); // Impede o comportamento padrão do Enter
			resizeTable(); // Chama a função para redimensionar a tabela
		}
	}



			function toggleAutoFill() {
				if (document.getElementById('autoFillCheckbox').checked) {
					autoFillTable();
				} else {
					clearTable();
				}
			}
			function getProductNames() {

				let productNames;
				let rows;

				if(){
					//Distribuição
					//Se for usuário com UUID etc. 
					//Pegar das tabelas que ele inseriu os produtos que escolheu pra retirar
					rows = document.querySelectorAll('#bensDeConsumoTable tbody tr');
					productNames = Array.from(rows).map(row => row.querySelector('td:first-child input').value);
					console.log("productNames do UUID: ");
					console.log(productNames);

				} else {
					//Produção
					rows = document.querySelectorAll('#inputTable tbody tr');
					productNames = Array.from(rows).map(row => row.querySelector('td:first-child input').value);
					console.log("productNames de Comitê: ");
					console.log(productNames);
				}


				return productNames;
			}

			function setProductNames(productNames) {
				const rows = document.querySelectorAll('#inputTable tbody tr');
				rows.forEach((row, index) => {
					const input = row.querySelector('td:first-child input');
					if (input && productNames[index]) {
						input.value = productNames[index];
					}
				});
			}

			function setSectorNames(sectorNames) {
				const headers = document.querySelectorAll('#inputTable thead tr th');
				headers.forEach((header, index) => {
					if (index > 0 && sectorNames[index - 1]) { // Pula a primeira coluna ("Produtos")
						const input = header.querySelector('input');
						if (input) {
							input.value = sectorNames[index - 1]; // Define o título correto do setor
						}
					}
				});
			}
			
			function getSectorNames() {
				const headers = document.querySelectorAll('#inputTable thead tr th');
				return Array.from(headers)
					.slice(1) // Ignora a primeira coluna (nomes dos produtos)
					.map(header => {
						const input = header.querySelector('input');
						return input ? input.value : `Setor ${Array.from(headers).indexOf(header)}`;
					});


				if(){
					//Se for usuário com UUID etc. 
					//Pegar das tabelas que ele inseriu os produtos que escolheu pra retirar
					//Se conter a palavra "Rede" é só pegar o nome inteiro, senão, incluir "Produção de " antes
					//Usuário trabalhador consumidor nesse contexto de consumo não está produzindo, porém até que
					//eu confirme que não será necessário para a planificação incluindo a damanda desse usuário,
					// ainda vou manter, mas depois deverá ser retirado (confirmado que não afetará em nada, que não é usado em cálculo nenhum)
					//Abaixo devo substituir pelo mesmo código que usar em "n getProductNames("
					const rows = document.querySelectorAll('#inputTable tbody tr');
					return Array.from(rows).map(row => row.querySelector('td:first-child input').value);

				}


			}


			function getFinalDemand() {
				const tbody = document.querySelector('#finalDemandInputs');
				const inputs = tbody.querySelectorAll('input[type="number"]');
				return Array.from(inputs).map(input => parseFloat(input.value) || 0);

				if(){
					//Se for usuário com UUID etc.
					//Pegar das tabelas que ele inseriu os produtos que escolheu pra retirar
					const tbody = document.querySelector('#finalDemandInputs');
					const inputs = tbody.querySelectorAll('input[type="number"]');
					return Array.from(inputs).map(input => parseFloat(input.value) || 0);

				}

			}


			function makeSquareMatrix(matrix) {
				const size = Math.max(matrix.length, matrix[0].length);
				return Array.from({ length: size }, (_, i) =>
					Array.from({ length: size }, (_, j) => (matrix[i] && matrix[i][j]) || 0)
				);
			}

			function adjustDemandVector(demand, size) {
				return Array.from({ length: size }, (_, i) => demand[i] || 0);
			}

	function resetEconomy() {
		const confirmation = confirm("Tem certeza de que deseja resetar a economia? Todos os dados serão perdidos e a economia será restaurada para o estado inicial.");
		if (confirmation) {
			location.reload(); // Recarrega a página, restaurando todos os dados ao estado inicial
		}
	}


	function formatDays(totalHours) {
		const days = Math.floor(totalHours / 24);
		const remainingHours = totalHours % 24; // Calcula as horas restantes que não completam um dia

		const years = Math.floor(days / 365);
		const remainingDaysAfterYears = days % 365;
		const months = Math.floor(remainingDaysAfterYears / 30);
		const remainingDaysAfterMonths = remainingDaysAfterYears % 30;
		const weeks = Math.floor(remainingDaysAfterMonths / 7);
		const remainingDays = remainingDaysAfterMonths % 7;

		const pluralize = (value, singular, plural) => value === 1 ? singular : plural;

		const parts = []; // Lista para armazenar as partes não nulas

		if (years > 0) parts.push(`${years} ${pluralize(years, "ano", "anos")}`);
		if (months > 0) parts.push(`${months} ${pluralize(months, "mês", "meses")}`);
		if (weeks > 0) parts.push(`${weeks} ${pluralize(weeks, "semana", "semanas")}`);
		if (remainingDays > 0) parts.push(`${remainingDays} ${pluralize(remainingDays, "dia", "dias")}`);
		if (remainingHours > 0) parts.push(`${remainingHours} ${pluralize(remainingHours, "hora", "horas")}`);

		return parts.join(", ");
	}

	// Função para embaralhar a lista de notícias
	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}


	function fetchNewsTitles() {
		// Dados estáticos simulando as notícias retornadas pela API
		const headlines = [
		"Vale do São Francisco (BA/PE): Produção de 963 mil toneladas de manga e 207,7 mil toneladas de uva de mesa.",
		"Chapada do Apodi (RN): Exportação de quase metade do melão nacional e 12% da melancia.",
		"Região Sul (PR, SC, RS): 96% da produção de uva industrial do Brasil, com destaque para vinhos e espumantes.",
		"Pará (Norte): Produção de 1,5 milhão de toneladas de açaí, representando 94% do total nacional.",
		"Centro-Oeste: Crescimento no cultivo de frutas nativas como guaraná e castanha-do-Brasil.",
		"Sudeste: Produção de 17,7 milhões de toneladas de laranja prevista para 2024.",
		"Sul da Bahia: Projeto de reflorestamento na APA do Pratigi recuperou 140 hectares e revitalizou 100 nascentes.",
		"Mata Atlântica (RJ): Projeto Onda Verde já plantou 2 milhões de mudas em 26 anos.",
		"Amazônia Legal: Reflorestamento de 30 milhões de árvores nativas em 25 áreas desmatadas.",
		"Cerrado (GO/MS/MT): 500 hectares restaurados no projeto Emas-Taquari, conectando parques e beneficiando 51 famílias.",
		"Indústria Eletroeletrônica (SP): Produção deve crescer 3% em 2024, com aumento de semicondutores e motores elétricos.",
		"Campinas (SP): Parques tecnológicos desenvolvendo novos sensores para agricultura e saúde.",
		"Norte e Nordeste: Crescimento de semicondutores para energia solar e hidrogênio verde.",
		"Sul do Brasil: Automação industrial impulsiona modernização de 60 fábricas em 2024.",
		"Região Centro-Oeste: Projetos de robótica colaborativa ampliam exportação de equipamentos industriais.",
		"Frente Oeste (RS): Desenvolvimento de infraestrutura digital e turismo inteligente com tecnologia.",
		"Bahia: Uso de tecnologia quântica em projetos industriais para soluções avançadas.",
		"São Paulo: Indústria de software cresce 8%, com destaque para inteligência artificial em saúde e logística.",
		"Amazônia: Restauração de ecossistemas com biotecnologia para 100 mil hectares até 2025.",
		"Ceará: Ampliação da fabricação de equipamentos para telecomunicações, com 5G liderando a transformação."
	];


		const shuffledHeadlines = shuffleArray([...headlines]); // Embaralha as notícias
		const newsText = shuffledHeadlines.join(' - '); // Cria o texto para o letreiro
		const marquee = document.getElementById('newsMarquee');
		marquee.innerHTML = `
			<img src="https://i.postimg.cc/65gr9cjN/bandeiravermelhaanimada.gif" alt="Bandeira Vermelha">
			${newsText}
		`;
		
	}

	// Chama a função imediatamente para carregar os dados na primeira vez
	fetchNewsTitles();

	function updateProductName(rowIndex, newName) {
		const demandRows = document.querySelectorAll('#finalDemandInputs tr');
		const sectorHeader = document.querySelector(`#inputTable thead tr th:nth-child(${rowIndex + 2}) input`);

		if (demandRows[rowIndex]) {
			const productCell = demandRows[rowIndex].querySelector('td:first-child');
			if (productCell) {
				productCell.textContent = newName; // Atualiza o nome do produto na tabela Demanda Final
			}
		}
		
		if (sectorHeader) { 
			if (newName.includes("Rede")) {
				sectorHeader.value = newName;
			} else {
				sectorHeader.value = `Produção de ${newName}`;
			}
		}

		//showNotification(`Produto ${rowIndex + 1} atualizado para: ${newName}`, true);
	}

	function updateSectorName(colIndex, newName) {
		const thead = document.querySelector('#inputTable thead tr');
		const headerCell = thead.querySelectorAll('th')[colIndex + 1]; // Coluna começa no índice 1

		if (headerCell) {
			const input = headerCell.querySelector('input[type="text"]');
			if (input) {
				input.value = newName; // Atualiza o título da coluna
			}
		}

		//showNotification(`Setor ${colIndex + 1} atualizado para: ${newName}`, true);
	}

	function isOptimizationDataComplete(productIndex) {
		const inputs = optimizationInputs[productIndex];
		if (!inputs) return false;

		return (
			inputs.workerLimit > 0 &&
			inputs.workerHours > 0 &&
			inputs.productionTime > 0 &&
			inputs.weeklyScale > 0
		);
	}

	// Manipulador para pressionar "Enter" nos campos de Login ou Cadastre-se
	document.addEventListener('keydown', function(event) {
		if (event.key === 'Enter') {
			const activeElement = document.activeElement; // Elemento que está em foco
			const loginSection = document.getElementById('loginSection');
			const registerFields = document.getElementById('registrationFields');

			// Verifica se a seção de Login está visível
			if (loginSection && loginSection.style.display !== 'none') {
				// Caso esteja no modo de Cadastro
				if (registerFields && registerFields.style.display === 'block') {
					// Verifica se o foco está em um dos campos de Cadastro
					if (activeElement.id === 'instance' || 
						activeElement.id === 'pronoun' || 
						activeElement.id === 'jurisdiction' || 
						activeElement.id === 'preposition') {
						event.preventDefault(); // Impede o comportamento padrão do Enter
						handleRegister(); // Simula o clique no botão "Cadastrar"
						return;
					}
				}

				// Verifica se o foco está nos campos de Nome de Usuário ou Senha
				if (activeElement.id === 'username' || activeElement.id === 'password') {
					event.preventDefault(); // Impede o comportamento padrão do Enter
					//document.getElementById('loginButton').click(); // Simula o clique no botão "Entrar"
					handleLogin();
				}
			}
		}
	});

	function setFinalDemand(finalDemandData) {
		const tbody = document.getElementById('finalDemandInputs');
		const rows = tbody.querySelectorAll('tr');

		// Certifica-se de que o número de entradas de demanda corresponda ao número de linhas
		rows.forEach((row, index) => {
			const input = row.querySelector('input[type="number"]');
			input.value = finalDemandData[index] !== undefined ? finalDemandData[index] : 0;
		});

		showNotification("Demanda final atualizada com os dados recebidos.", true);
	}

	// Evento para fechar o modal ao clicar fora do conteúdo
	window.addEventListener('click', (event) => {
		const modals = document.querySelectorAll('.modal');
		modals.forEach(modal => {
			if (event.target === modal) { // Verifica se o clique foi fora do modal
				modal.style.display = 'none';
			}
		});
		
		const menu = document.getElementById('languageMenu');
        const button = document.getElementById('languageButton');
        if (!menu.contains(event.target) && event.target !== button) {
            menu.style.display = 'none';
        }
		
	});

	 // Manipula a rolagem para criar o efeito de parallax
	 let currentOffset = 0; // Posição atual suavizada
		let targetOffset = 0;  // Posição alvo

		const lerp = (start, end, t) => start + (end - start) * t; // Função de interpolação linear

		const updateBackground = () => {
			// Aproxima a posição atual da posição alvo com suavidade
			currentOffset = lerp(currentOffset, targetOffset, 0.05);

			// Define a posição do fundo
			document.body.style.setProperty('--background-offset', `${currentOffset}%`);

			// Continua o loop
			requestAnimationFrame(updateBackground);
		};

		// Atualiza a posição alvo com base na rolagem do usuário
		window.addEventListener('scroll', () => {
			const scrollPosition = window.scrollY;
			const maxScroll = document.body.scrollHeight - window.innerHeight;

			// Calcula o deslocamento desejado para a imagem de fundo
			targetOffset = (scrollPosition / maxScroll) * 100;
		});

		// Inicia o loop de atualização do plano de fundo
		updateBackground();

	function savePropostaInputs() {
		const workerLimit = document.getElementById("workerLimitProposta").value.trim();
		const workerHours = document.getElementById("workerHoursProposta").value.trim();
		const productionTime = document.getElementById("productionTimeProposta").value.trim();
		const nightShift = document.getElementById("nightShiftProposta").checked;
		const weeklyScale = document.getElementById("weeklyScaleProposta").value.trim();

		propostaDados = {
			workerLimit,
			workerHours,
			productionTime,
			nightShift,
			weeklyScale
		};

		closePropostaModal();
	}

	// Atualiza o título da coluna na tabela "Vetor Tecnológico"
	function atualizarTituloColunaVetorTecnologico() {
		const produtoInput = document.querySelector('#producaoMetaTable tbody tr td:first-child input');
		const produtoNome = produtoInput.value || "Produto";
		const colunaTitulo = document.querySelector('#vetorTecnologicoTable thead tr th:nth-child(2)');
		if (colunaTitulo) {
			colunaTitulo.innerHTML = `Quantidade necessária para produzir 1 unidade de ${produtoNome}`;
		}
	}

	//COLOCAR AQUI NESSA FUNÇÃO TRECHO QUE, SEJA O CONSELHO QUE FOR, SOMA A CADA SUB-CONSELHO (COMEÇANDO DE ZERO) O TRABALHO SOCIAL TOTAL REALIZADO, ASSIM NO CONSELHO MUNDIAL, AO EXECUTAR ESSA FUNÇÃO, JÁ TEM SEMPRE O VALOR DO TRABALHO SOCIAL TOTAL ATUALIZADO. COMO CONSEGUE O TRABALHO TOTAL REALIZADO DE UM CONSELHO? VEM DE QUAL ATRIBUTO?
	async function fetchEstimates() {
		
	if (!confirm("Alguns dados da Matriz Tecnológica atual serão perdidos e substituídos por dados da estimativa calculada. Tem certeza que deseja prosseguir?")) {
		return; // Sai da função se o usuário desistir
	}
		
    try {
        const response = await fetch(apiUrl, {
			method: 'GET',
			headers: headers
		});


        if (!response.ok) {
            throw new Error("Erro ao buscar dados do JSONBIN.");
        }

        const data = await response.json();

// Adição para processar matrizes tecnológicas dos Conselhos acima do Distrital
if (!user.instancePrepositionJurisdictionUUID.includes("Distrital") && !user.instancePrepositionJurisdictionUUID.includes("Comitê")) {
    const recordsArray = Object.values(data);
    const relevantMatrices = recordsArray.filter(item => 
        item.conselhoPopularAssociadoDeConselhoPopular === user.instancePrepositionJurisdictionUUID &&
        item.inputTable
    );
	
	

    if (relevantMatrices.length > 0) {
        const productSet = new Set();
        const averagedMatrix = {};
        const demandVector = {};
        const optimizationInputs = []; // Array para armazenar os dados para cada produto

        // Lista todos os produtos sem redundância e também calcula o trabalho social total em conselhos supradistritais
        relevantMatrices.forEach(matrix => {
            matrix.productNames.forEach(productName => productSet.add(productName)); //productSet acaba com a redundância que existe aqui nessa iteração

			//Soma o Trabalho Social Total da jurisdição do respectivo Conselho Supradistrital (não Comitês nem Conselhos Distritais, que já está feito e calculando corretamente). Serve para todos os supradistritais até o Conselho Mundial
			totalSocialWorkDessaJurisdicao += matrix.totalSocialWorkDessaJurisdicao;
			
			console.info("totalSocialWorkDessaJurisdicao += matrix.totalSocialWorkDessaJurisdicao;");
			console.log(totalSocialWorkDessaJurisdicao);
			
        });

        const productList = Array.from(productSet); // Lista ordenada de produtos

        // Calcula médias para cada combinação de produto e setor
        productList.forEach((productName, productIndex) => {
            relevantMatrices.forEach(matrix => {
                const matrixProductIndex = matrix.productNames.indexOf(productName);
				
				if (matrixProductIndex !== -1) {
				
                    // Cálculo da matriz tecnológica
                    matrix.inputTable[matrixProductIndex].forEach((value, sectorIndex) => {
                        const sectorName = matrix.productNames[sectorIndex].includes("Rede") ? matrix.productNames[sectorIndex] : `Produção de ${matrix.productNames[sectorIndex]}`;
                        const key = `${productName}:${sectorName}`;
                        if (!averagedMatrix[key]) {
                            averagedMatrix[key] = { sum: 0, count: 0 };
                        }
                        if (value !== undefined && value !== null) {
							
							//alert("averagedMatrix[key].sum += parseFloat(value);");
							//ENTROU. CADA CONSELHO FAZER SUA SOMA COM BASE NA VARIAVEL DOS CONSELHOS ABAIXO (SO SOMAR TUDO QUE VEM DE BAIXO, 1 VEZ POR CONSELHO (IF SE CONSELHO É DIFERENTE DO ANTERIOR, PRA VER SE JA MUDOU) E COLOCAR NA VARIAVEL
							//OPTIMIZATIONINPUTS[PRODUCTINDEX] DO CONSELHO (DATA. OU MATRIX. OU ALGO DO TIPO QUE CARREGOU NESSA ITERAÇÃO, MAS ANTES CARREGAVA SO COMITE, VE SE CARREGA CONSELHO COM CONSELHOASSOCIADODECONSELHO IGUAL AO DO USUARIO ATUAL) MULTIPLICADO PELO QUE JÁ FOI PRODUZIDO ATÉ ESSA JURISDIÇÃO
							
							//console.info("matrix: ");
							//console.log(matrix);
							
                            averagedMatrix[key].sum += parseFloat(value);
                            averagedMatrix[key].count += 1;
                        }
                    });

                    // Cálculo do vetor de demanda
                    const demandValue = matrix.finalDemand[matrixProductIndex];
                    if (!demandVector[productName]) {
                        demandVector[productName] = { sum: 0, count: 0 };
                    }
                    if (demandValue !== undefined && demandValue !== null) {
						
						//alert("demandVector[productName].sum += parseFloat(demandValue);");
						//ENTROU. CADA CONSELHO FAZER SUA SOMA COM BASE NA VARIAVEL DOS CONSELHOS ABAIXO (SO SOMAR TUDO QUE VEM DE BAIXO, 1 VEZ POR CONSELHO (IF SE CONSELHO É DIFERENTE DO ANTERIOR, PRA VER SE JA MUDOU) E COLOCAR NA VARIAVEL
						//OPTIMIZATIONINPUTS[PRODUCTINDEX] DO CONSELHO (DATA. OU MATRIX. OU ALGO DO TIPO QUE CARREGOU NESSA ITERAÇÃO, MAS ANTES CARREGAVA SO COMITE, VE SE CARREGA CONSELHO COM CONSELHOASSOCIADODECONSELHO IGUAL AO DO USUARIO ATUAL) MULTIPLICADO PELO QUE JÁ FOI PRODUZIDO ATÉ ESSA JURISDIÇÃO
						
						//Entra quando é Comitê ou Conselho
						//totalSocialWorkDessaJurisdicao já está calculado certo e salvo nos conselhos distritais abaixo
						
                        demandVector[productName].sum += parseFloat(demandValue);
                        demandVector[productName].count += 1;						
					}
				}
			});

            // Inicializa os campos para cálculo das médias dos campos exibidos na janela modal
            let totalWorkerLimit = 0, countWorkerLimit = 0;
            let totalWorkerHours = 0, countWorkerHours = 0;
            let totalProductionTime = 0, countProductionTime = 0;
            let totalWeeklyScale = 0, countWeeklyScale = 0;
			let totalNightShift = 0, countNightShift = 0;

            // Calcula as médias para os campos exibidos na janela modal
            relevantMatrices.forEach(matrix => {
                let matrixProductIndex = matrix.productNames.indexOf(productName);

				//console.info("matrixProductIndex: ");
				//console.log(matrixProductIndex);

                if (matrixProductIndex !== -1) {

					//console.info("matrix: ");
					//console.log(matrix);

                    let workerLimit = matrix.optimizationInputs[matrixProductIndex]?.workerLimit;
                    let workerHours = matrix.optimizationInputs[matrixProductIndex]?.workerHours;
                    let productionTime = matrix.optimizationInputs[matrixProductIndex]?.productionTime;
                    let weeklyScale = matrix.optimizationInputs[matrixProductIndex]?.weeklyScale;
					let nightShift = Number(matrix.optimizationInputs[matrixProductIndex]?.nightShift);
					
					
					//console.info("workerLimit: ");
					//console.log(workerLimit);
					//console.info("workerHours: ");
					//console.log(workerHours);
					//console.info("productionTime: ");
					//console.log(productionTime);
					//console.info("weeklyScale: ");
					//console.log(weeklyScale);

                    if (workerLimit !== undefined && workerLimit !== null) {
                        totalWorkerLimit += parseFloat(workerLimit);
                        countWorkerLimit++;
                    }

                    if (workerHours !== undefined && workerHours !== null) {
                        totalWorkerHours += parseFloat(workerHours);
                        countWorkerHours++;
                    }

                    if (productionTime !== undefined && productionTime !== null) {
                        totalProductionTime += parseFloat(productionTime);
                        countProductionTime++;
                    }

                    if (weeklyScale !== undefined && weeklyScale !== null) {
                        totalWeeklyScale += parseFloat(weeklyScale);
                        countWeeklyScale++;
                    }
					
					 if (nightShift !== undefined && nightShift !== null) {
                        totalNightShift += parseFloat(nightShift);
                        countNightShift++;
                    }
                }
            });

            // Adiciona os valores calculados ao array de inputs de otimização
            optimizationInputs[productIndex] = {
                workerLimit: countWorkerLimit > 0 ? (totalWorkerLimit / countWorkerLimit).toFixed(2) : '',
                workerHours: countWorkerHours > 0 ? (totalWorkerHours / countWorkerHours).toFixed(2) : '',
                productionTime: countProductionTime > 0 ? (totalProductionTime / countProductionTime).toFixed(2) : '',
                weeklyScale: countWeeklyScale > 0 ? (totalWeeklyScale / countWeeklyScale).toFixed(2) : '',
				nightShift: countNightShift > 0 ? Boolean(Math.round((totalNightShift / countNightShift).toFixed(2))) : false,
            };
        });

        // Calcula os valores finais da matriz tecnológica
        Object.keys(averagedMatrix).forEach(key => {
            averagedMatrix[key] = averagedMatrix[key].count > 0
                ? averagedMatrix[key].sum / averagedMatrix[key].count
                : 0; // Preenche com 0 se não houver dados
        });

        // Calcula os valores finais do vetor de demanda
        Object.keys(demandVector).forEach(key => {
            demandVector[key] = demandVector[key].count > 0
                ? demandVector[key].sum / demandVector[key].count
                : 0; // Preenche com 0 se não houver dados
        });

        // Atualiza a tabela de matriz tecnológica
        const inputTable = document.getElementById('inputTable');
        const thead = inputTable.querySelector('thead');
        const tbody = inputTable.querySelector('tbody');

        // Cria cabeçalho com base na lista de produtos
        thead.innerHTML = '<tr><th>Produtos / Setores Produtivos</th></tr>';
        productList.forEach((productName, index) => {
            const sectorHeader = document.createElement('th');
            const sectorInput = document.createElement('input');
            sectorInput.type = 'text';
            sectorInput.value = productName.includes("Rede") ? productName : `Produção de ${productName}`;
            sectorInput.readOnly = true;
            addTooltipBehavior(sectorInput); // Adiciona o comportamento de tooltip
            sectorHeader.appendChild(sectorInput);
            thead.querySelector('tr').appendChild(sectorHeader);
        });

        // Preenche linhas e células com os valores consolidados
        tbody.innerHTML = '';
        productList.forEach((productName, rowIndex) => {
            const row = document.createElement('tr');

            // Primeira célula: nome do produto com funcionalidade de edição
            const productCell = document.createElement('td');
            const productInput = document.createElement('input');
            productInput.type = 'text';
            productInput.value = productName;

            // Sincroniza o nome do produto com o título do setor
            productInput.oninput = () => {
                const correspondingHeader = thead.querySelectorAll('th')[rowIndex + 1]; // +1 para ignorar a coluna de produtos
                if (correspondingHeader) {
                    const headerInput = correspondingHeader.querySelector('input');
                    headerInput.value = productInput.value.includes("Rede") ? productInput.value : `Produção de ${productInput.value}`;
                }
            };

            // Ajusta o cursor para o final do texto
            productInput.addEventListener('focus', () => {
                productInput.setSelectionRange(productInput.value.length, productInput.value.length);
            });

            productCell.appendChild(productInput);
            row.appendChild(productCell);

            // Outras células: valores médios ou "0"
            productList.forEach(targetProductName => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.readOnly = true;

                const key = `${productName}:${targetProductName.includes("Rede") ? targetProductName : `Produção de ${targetProductName}`}`;
                input.value = averagedMatrix[key] !== undefined ? averagedMatrix[key].toFixed(2) : 0;
                cell.appendChild(input);
                addHighlightBehavior(cell); // Adiciona o comportamento de destaque
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

		// Atualiza os valores de "Número de produtos" e "Número de Setores Produtivos"
		const numRows = document.getElementById('numRows'); // Campo "Número de produtos"
		const numCols = document.getElementById('numCols'); // Campo "Número de Setores Produtivos"

		// Obtém o número de linhas (produtos) e colunas (setores) da tabela "Matriz Tecnológica"
		const numProducts = tbody.querySelectorAll('tr').length; // Número de linhas
		const numSectors = thead.querySelector('tr').querySelectorAll('th').length - 1; // Número de colunas, excluindo a coluna "Produtos / Setores Produtivos"

		// Atualiza os campos com os valores calculados
		if (numRows) numRows.value = numProducts;
		if (numCols) numCols.value = numSectors;

        // Atualiza a tabela de demanda final com botões "Otimizar"
        const demandTableBody = document.getElementById('finalDemandInputs');
        demandTableBody.innerHTML = '';
        productList.forEach((productName, index) => {
            const row = document.createElement('tr');

            // Primeira célula: nome do produto
            const productCell = document.createElement('td');
            productCell.textContent = productName;
            row.appendChild(productCell);

            // Segunda célula: valor de demanda
            const demandCell = document.createElement('td');
            const demandInput = document.createElement('input');
            demandInput.type = 'number';
            demandInput.readOnly = true;
            demandInput.value = demandVector[productName] !== undefined ? demandVector[productName].toFixed(2) : 0;
            demandCell.appendChild(demandInput);
            row.appendChild(demandCell);

            // Terceira célula: Botão "Otimizar"
            const actionsCell = document.createElement('td');
            const optimizeButton = document.createElement('button');
            optimizeButton.textContent = 'Otimizar';
            optimizeButton.classList.add('optimize-button');
			//console.info("optimizationInputs: ");
			//console.log(optimizationInputs);
            optimizeButton.onclick = () => openOptimizationModalEstimates(index, optimizationInputs);
            actionsCell.appendChild(optimizeButton);
            row.appendChild(actionsCell);

            // Adiciona a linha à tabela
            demandTableBody.appendChild(row);
        });
    } else {
        showNotification("Nenhuma matriz tecnológica encontrada para os Conselhos abaixo do seu.", false);
    }
}
// Fim da adição


        if (typeof data === 'object' && data !== null) {
            const inputTechnologicalMatrixTableBody = document.getElementById('inputTechnologicalMatrixTableBody');
            Array.from(inputTechnologicalMatrixTableBody.rows).forEach(row => { //Iteração das linhas da matriz tecnológica
                let productName = row.cells[0].querySelector('input')?.value.trim() || '';

                const recordsArray = Object.values(data);

                let setorUnidade;
				
				if (productName.includes("Rede")) {
					setorUnidade = productName;
				} else {
					setorUnidade = `Produção de ${productName}`;
				}

				//toda vez que itera linha de matriz tecnológica itera as colunas pra achar a do produto atual que pertence ao vetor de demanda do comitê. filteredRecords é a lista de unidades de produção de cada setor que está sendo iterado. é a lista do setor iterado dessa vez.
                const filteredRecords = recordsArray.filter(item => 
                    item.conselhoPopularAssociadoDeComiteOuTrabalhador === user.instancePrepositionJurisdictionUUID && //QUANDO FOR CONSELHO CONSULTANDO CONSELHO USARÁ item.conselhoPopularAssociadoDeConselhoPopular
                    item.setorUnidade === setorUnidade
                );

                let resultMessage = "";
                let summedTechnologicalVectors = [];
				let summedDemandVectors = [];
				let summedProposalVectors = [];
                let workerLimit = null;

				//console.info("filteredRecords: ");
				//console.log(filteredRecords);

                if (filteredRecords.length > 0) {
                    resultMessage = `Vetores Tecnológicos do setor ${setorUnidade}:\n`;

                    const demandaFinalInputs = document.querySelectorAll('#finalDemandInputs input[type="number"]');
                    let productIndex = -1;

                    demandaFinalInputs.forEach((input, index) => {
                        const produtoNome = document.querySelectorAll('#finalDemandInputs tr')[index].cells[0].textContent.trim();
                        if (produtoNome === productName) { //Achando a coluna da matriz tecnológica que está o setor
                            productIndex = index;							
                        }
                    });

                    if (productIndex === -1) {
                        showNotification(`Cadastre o produto ${productName} nesse Conselho!`, false);
                        return;
                    }

					let limiteEfetivoTrabalhadoresTotal = 0;

					for (const productionUnit of filteredRecords) { //soma para achar o limiteEfetivoTrabalhadoresTotal necessário para o cálculo do peso.
						limiteEfetivoTrabalhadoresTotal = limiteEfetivoTrabalhadoresTotal + parseInt(productionUnit.limiteEfetivoTrabalhadores);
						
						console.info('productionUnit.effectivelyPlannedProductionTime: ');
						console.log(productionUnit.effectivelyPlannedProductionTime);
						
						//Só passa aqui quando é Comitê
						totalSocialWorkDessaJurisdicao += productionUnit.producaoMeta[0].quantidadeProduzida*productionUnit.effectivelyPlannedProductionTime;
						
				
					}
					
					//console.info("limiteEfetivoTrabalhadoresTotal: ");
					//console.log(limiteEfetivoTrabalhadoresTotal);
					
					console.info("totalSocialWorkDessaJurisdicao: ");
					console.log(totalSocialWorkDessaJurisdicao);

                    for (const productionUnit of filteredRecords) { //iteração das unidades de produção do setor desta rodada na iteração. o limiteEfetivoTrabalhadoresTotal deve ser somado antes, de todas essas unidades, antes de prosseguir, o que foi feito acima
						
						productionUnit.vetorDemanda = [];
						productionUnit.vetorProposta = [];
						if (Array.isArray(productionUnit.estoqueDemanda)) {
							 productionUnit.vetorDemanda = productionUnit.estoqueDemanda.map(item => item.demanda);
						}
						if (productionUnit.limiteEfetivoTrabalhadores !== undefined && productionUnit.propostaTrabalhadores) {
							productionUnit.vetorProposta = [
								productionUnit.limiteEfetivoTrabalhadores,
								productionUnit.propostaTrabalhadores.workerHours,
								productionUnit.propostaTrabalhadores.productionTime,
								Number(productionUnit.propostaTrabalhadores.nightShift), // transforma true e false em 1 e 0 pra poder calcular média e depois voltamos pra true e false arredondando pra 1 ou 0
								productionUnit.propostaTrabalhadores.weeklyScale
							];
						}
						
                        const vetorTecnologico = productionUnit.vetorTecnologico;
						const vetorDemanda = productionUnit.vetorDemanda;
						const vetorProposta = productionUnit.vetorProposta;
						
                        const limiteEfetivoTrabalhadores = parseFloat(productionUnit.limiteEfetivoTrabalhadores);

                        //if (optimizationInputs[productIndex] && optimizationInputs[productIndex].workerLimit) {
                        //    workerLimit = parseFloat(optimizationInputs[productIndex].workerLimit);
                        //}

                        //if (!workerLimit || isNaN(workerLimit)) {
                        //    showNotification(`Preencha os dados de otimização de ${productName}`, false);
                        //    openOptimizationModal(productIndex);
                        //    return;
                        //}

                        const productionUnitWeight = limiteEfetivoTrabalhadores / limiteEfetivoTrabalhadoresTotal;
						
						//console.info("limiteEfetivoTrabalhadores: ");
						//console.log(limiteEfetivoTrabalhadores);
						//console.info("limiteEfetivoTrabalhadores/limiteEfetivoTrabalhadoresTotal = productionUnitWeight: ");
						//console.log(productionUnitWeight);
						
                        const adjustedTechnologicalVectors = vetorTecnologico.map(value => (value * productionUnitWeight).toFixed(2));
						const adjustedDemandVectors = vetorDemanda.map(value => (value * productionUnitWeight).toFixed(2));
						const adjustedProposalVectors = vetorProposta.map(value => (value * productionUnitWeight).toFixed(2));
						adjustedProposalVectors[0]=limiteEfetivoTrabalhadoresTotal; //não calcula o peso do limiteEfetivoTrabalhadores, pois ele é real, efetivo, e é usado para o calculo do peso (não pode ser peso dele mesmo)

                        if (summedTechnologicalVectors.length === 0) {
                            summedTechnologicalVectors = adjustedTechnologicalVectors.map(val => parseFloat(val));
                        } else {
                            summedTechnologicalVectors = summedTechnologicalVectors.map((sum, i) => sum + parseFloat(adjustedTechnologicalVectors[i]));
                        }
						
						if (summedDemandVectors.length === 0) {
                            summedDemandVectors = adjustedDemandVectors.map(val => parseFloat(val));
                        } else {
                            summedDemandVectors = summedDemandVectors.map((sum, i) => sum + parseFloat(adjustedDemandVectors[i]));
                        }
						
						if (summedProposalVectors.length === 0) {
                            summedProposalVectors = adjustedProposalVectors.map(val => parseFloat(val));
                        } else {
                            summedProposalVectors = summedProposalVectors.map((sum, i) => sum + parseFloat(adjustedProposalVectors[i]));
                        }

                        resultMessage += `De alguma fábrica: ${vetorTecnologico.join(", ")}\n`;
                        resultMessage += `pesoDaUnidadeDeProdução=${productionUnitWeight.toFixed(2)}\n`;
                        resultMessage += `Vetor Tecnológico Médio: ${adjustedTechnologicalVectors.join(", ")}\n`;

                        const weightedAverageTechnologicalVector = summedTechnologicalVectors.map(sum => (sum / filteredRecords.length).toFixed(2));
                        resultMessage += `Média Ponderada dos Vetores Tecnológicos: ${weightedAverageTechnologicalVector.join(", ")}`;
						
						const weightedAverageDemandVector = summedDemandVectors.map(sum => (sum / filteredRecords.length).toFixed(2));
                        resultMessage += `Média Ponderada dos Vetores Demandas: ${weightedAverageDemandVector.join(", ")}`;
						
						const weightedAverageProposalVector = summedProposalVectors.map(sum => (sum / filteredRecords.length).toFixed(2));
						
						//Arredonda valores que não podem ser quebrados
						//weightedAverageProposalVector[0] = Math.round(weightedAverageProposalVector[0]); //limiteEfetivoTrabalhadores Total (não médio, senão não normaliza)
						
						//console.info("limiteEfetivoTrabalhadoresTotal: ");
						//console.log(limiteEfetivoTrabalhadoresTotal);
						
						
						
						weightedAverageProposalVector[0] = Math.round(limiteEfetivoTrabalhadoresTotal);
						weightedAverageProposalVector[1] = parseFloat(weightedAverageProposalVector[1]); //workerHours média
						weightedAverageProposalVector[2] = parseFloat(weightedAverageProposalVector[2]);
						weightedAverageProposalVector[3] = Boolean(Math.round(weightedAverageProposalVector[3])); //Turno Diurno/Noturno. se menor ou igual a 0,5 retorna false, se maior retorna true (média booleana)
						weightedAverageProposalVector[4] = Math.round(weightedAverageProposalVector[4]); //weeklyScale média
						
						//console.info("weightedAverageProposalVector[4]: ");
						//console.log(weightedAverageProposalVector[4]);
						
						
                        resultMessage += `Média Ponderada dos Vetores Propostas: ${weightedAverageProposalVector.join(", ")}`;

                        if (productionUnit.estoqueDemanda && Array.isArray(productionUnit.estoqueDemanda)) {
                            const inputTechnologicalMatrixTableBody = document.getElementById('inputTechnologicalMatrixTableBody');
							
							const inputFinalDemandTableBody = document.getElementById('finalDemandInputs');

                            if (inputTechnologicalMatrixTableBody.rows.length >= weightedAverageTechnologicalVector.length + 1) {
							
                                productionUnit.estoqueDemanda.forEach((estoqueDemandaRow, index) => {
                                    const bemDeProducao = estoqueDemandaRow.bemDeProducao.trim();
									
                                    const matchingTechnologicalRow = Array.from(inputTechnologicalMatrixTableBody.rows).find(r => r.cells[0].querySelector('input').value.trim() === bemDeProducao);
									
									const matchingFinalDemandRow = Array.from(inputFinalDemandTableBody.rows).find(r => r.cells[0].textContent.trim() === bemDeProducao);
									
									const thead = document.getElementById('inputTable').querySelector('thead');
                                    const sectorHeaders = thead.querySelectorAll('th input');
                                    const setorColIndex = Array.from(sectorHeaders).findIndex(input => input.value.includes(setorUnidade)) + 1;

                                    if (matchingTechnologicalRow && matchingTechnologicalRow.cells[setorColIndex]?.querySelector('input')) {
                                    
									//Estimativas na Matriz Tecnológica
									matchingTechnologicalRow.cells[setorColIndex].querySelector('input').value = weightedAverageTechnologicalVector[index];
																		
									//console.info(`weightedAverageDemandVector[${index}]`);
									//console.log(weightedAverageDemandVector[index]);
									
									//Estimativa no vetor Demanda Final 
									matchingFinalDemandRow.cells[1].querySelector('input').value = weightedAverageDemandVector[index];
									
									//Estimativas na janela modal "Otimização"									
									document.getElementById('workerLimit').value = weightedAverageProposalVector[0];
									document.getElementById('workerHours').value = weightedAverageProposalVector[1];
									document.getElementById('productionTime').value = weightedAverageProposalVector[2];
									document.getElementById('nightShift').checked = weightedAverageProposalVector[3];
									document.getElementById('weeklyScale').value = weightedAverageProposalVector[4];
									
									currentProductIndex = productIndex;
									
									//Salvar modal (pra ajustar botão inclusive)
									setTimeout(() => {
										saveOptimizationInputs();
									}, 3000);
										
                                    } else {
                                        showNotification(`Cadastre o produto ${bemDeProducao}, pois é um bem de produção do setor ${setorUnidade}.`, false);
                                    }
                                });
								
                            } else {
                                resultMessage = `A Matriz Tecnológica não possui a mesma quantidade de produtos mínima usados como bens de produção do setor ${setorUnidade}. Deve possuir no mínimo ${weightedAverageTechnologicalVector.length + 1} linhas (ou produtos). Cadastre os bens de produção desse setor.`;
								showNotification(resultMessage, false);
                            }
                        }
                    }
                } else {
                    //resultMessage = `Nenhum vetor tecnológico encontrado para o setor ${setorUnidade}.`;
                }

                console.info(resultMessage);
            });
        } else {
            console.error("data não é um objeto válido.");
            alert("Ocorreu um erro ao processar os dados. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro ao buscar vetores tecnológicos:", error);
        alert("Ocorreu um erro ao buscar os vetores tecnológicos. Por favor, tente novamente.");
    }
}



