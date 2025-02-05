// Função para fechar o modal
function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    modal.style.display = 'none';
}

function openOptimizationModal(productIndex) {
			   
    currentProductIndex = productIndex;

    // Inicializa os dados de otimização para o produto, se necessário
    if (!optimizationInputs[productIndex]) {
        optimizationInputs[productIndex] = {};
    }
    const inputs = optimizationInputs[productIndex] || {}; // Obtém ou inicializa os dados

    // Define o nome do produto no modal
    const productNames = getProductNames();
    document.getElementById('productName').textContent = productNames[productIndex];

    // Preenche os campos do modal com valores salvos ou padrão
    document.getElementById('workerLimit').value = inputs.workerLimit || '';
    document.getElementById('workerHours').value = inputs.workerHours || '';
    document.getElementById('productionTime').value = inputs.productionTime || '';
    document.getElementById('nightShift').checked = inputs.nightShift || false;
    document.getElementById('weeklyScale').value = inputs.weeklyScale || '';

    // Exibe o modal de otimização
    const modal = document.getElementById('optimizationModal');
    modal.style.display = 'flex';

    // Posiciona o cursor automaticamente no campo "Limite de Trabalhadores nas Fábricas"
    document.getElementById('workerLimit').focus();

    // Adiciona o ouvinte de eventos para capturar Enter
    document.addEventListener('keydown', handleEnterPress);
}

function closeOptimizationModal() {
    const modal = document.getElementById('optimizationModal');
    modal.style.display = 'none';
    document.removeEventListener('keydown', handleEnterPress); // Remove o ouvinte ao fechar
}

// Funções para abrir e fechar a modal
function openCopyableDataModal() {
    document.getElementById('copyableDataModal').style.display = 'flex'; // Exibe a modal
}

function closeCopyableDataModal() {
    document.getElementById('copyableDataModal').style.display = 'none'; // Fecha a modal
}

// Evento no botão para abrir a modal
document.getElementById('openCopyableDataModal').addEventListener('click', openCopyableDataModal);

function openOptimizationModalEstimates(productIndex, optimizationInputsLocal) {
    // Se optimizationInputsLocal for passado, use-o. Caso contrário, chame a função original
	
	optimizationInputs = optimizationInputsLocal;
	
	//console.info("optimizationInputs na openOptimizationModal: ");
	//console.log(optimizationInputs);
	
    //Chama a função original
    openOptimizationModal(productIndex);
}

function openProducaoMetaModal() {
    // Obtém a referência ao modal
    const modal = document.getElementById('producaoMetaModal');

    // Variáveis locais para exibir no modal
    const unitName = document.getElementById('comiteColTitle')?.value || 'Nome não definido';
    const productName = document.querySelector('#producaoMetaTable tbody tr td:first-child input')?.value || 'Produto não definido';
    const workersLimit = document.getElementById('limiteEfetivoTrabalhadores')?.value || '0';
    const producedQuantity = document.getElementById('producedQuantity')?.value || '0';
    const pendingQuantity = document.getElementById('pendingProductionQuantity')?.value || '0';
    const conselhoAssociado = document.getElementById('conselhoPopularAssociadoDeComiteOuTrabalhador')?.value || null;

    // Verifica se o Conselho Associado está definido
    if (!conselhoAssociado) {
        //console.info('Conselho Associado não definido.');
        return;
    }

	//alert(`${councilData} ${currentProductIndex} ${modalContext}`);

	if(null !== councilData && null !== currentProductIndex && null !== modalContext){
		populateModalContent(councilData, currentProductIndex, modalContext);
		return;
	}

    // Carregar os dados diretamente do JSONBIN usando conselhoAssociado como instanceKey
    showNotification('Carregando informações do Conselho associado...', true);

    fetch(apiUrl, {
		method: 'GET',
		headers: headers
	})
		.then(response => response.json())
		.then(binData => {
            const record = binData || {};
            councilData = record[conselhoAssociado]; // Usa conselhoAssociado como instanceKey

            // Verifica se os dados do Conselho Associado estão disponíveis
            if (!councilData || !councilData.productNames) {
                showNotification('Dados do Conselho associado não encontrados.', false);
                return;
            }

            // Encontra o índice do produto no array productNames
            currentProductIndex = councilData.productNames.indexOf(productName);
            if (currentProductIndex === -1) {
                showNotification('Produto não encontrado no Conselho associado.', false);
                return;
            }

			modalContext = {
                unitName,
                productName,
                workersLimit,
                producedQuantity,
                pendingQuantity
            };

            populateModalContent(councilData, currentProductIndex, modalContext);
        })
        .catch(err => {
            console.error('Erro ao buscar dados do JSONBin:', err);
            showNotification('Erro ao buscar dados do Conselho associado.', false);
        });
}

function populateModalContent(councilData, currentProductIndex, modalContext) {
	
	// Obtém os dados específicos do produto
	const optimizationInputs = councilData.optimizationInputs[currentProductIndex] || {};
	const optimizationResults = councilData.optimizationResults[currentProductIndex] || {};
	
    // Desestrutura o contexto para facilitar o acesso
    const { unitName, productName, workersLimit, producedQuantity, pendingQuantity } = modalContext;

    // Dados específicos do produto
    const workerHours = optimizationInputs.workerHours || 'Não definido';
    const weeklyScale = optimizationInputs.weeklyScale;
	const daysOff = 7 - weeklyScale; // Dias de folga na semana
	const formattedWeeklyScale = `${weeklyScale}X${daysOff}`; // Formata como solicitado
    const nightShift = optimizationInputs.nightShift ? 'Diurno e Noturno' : 'Diurno';
    const productionTime = optimizationInputs.productionTime || 0;
    const totalEmploymentPeriod = formatDays(parseFloat(optimizationResults.totalEmploymentPeriod) * 24); // Converte dias em horas para formatDays
	
	//console.info("optimizationInputs: ");
	//console.log(optimizationInputs);
	
	effectivelyPlannedProductionTime = productionTime; //para ser salvo e usado depois usado no calculo do trabalho social total. é pego já planificado a partir do conselho acima que fez o calculo de planificação

    // Atualiza o conteúdo do modal
    document.getElementById('producaoMetaContent').innerHTML = `
        <p><strong>Nome da Unidade de Produção:</strong> ${unitName}</p>
        <p><strong>Produto:</strong> ${productName}</p>
        <p><strong>Expediente:</strong> ${workerHours} horas</p>
        <p><strong>Escala Semanal:</strong> ${formattedWeeklyScale}</p>
        <p><strong>Quantidade Necessária de Trabalhadores:</strong> ${workersLimit}</p>
        <p><strong>Produção Finalizada:</strong> ${producedQuantity}</p>
        <p><strong>Produção Pendente:</strong> ${pendingQuantity}</p>
        <p><strong>Turno:</strong> ${nightShift}</p>
        <p><strong>Tempo para Produção (para contratação ou renovação):</strong> ${totalEmploymentPeriod}</p>
    `;
    document.getElementById('producaoMetaModal').style.display = 'flex';
}

function scrollToEndOfPage() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// Função para fechar qualquer modal aberto
function closeAllModals() {
    const modals = document.querySelectorAll('.modal'); // Seleciona todos os modais
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function openPropostaModal(index, productName) {
    const modal = document.getElementById('propostaModal');
    const unitName = document.getElementById('comiteColTitle').value || 'Unidade de Produção';
    document.getElementById('unitName').textContent = unitName;
    modal.style.display = 'flex';
    setupEnterKeyListenerForPropostaModal(); // Adiciona o ouvinte
}

function closePropostaModal() {
    document.getElementById('propostaModal').style.display = 'none';
}

function closeProducaoMetaModal() {
    const modal = document.getElementById('producaoMetaModal');
    modal.style.display = 'none';
}

// Função para lidar com a tecla Enter no modal "Proposta para demais Trabalhadores"
function setupEnterKeyListenerForPropostaModal() {
    const modal = document.getElementById("propostaModal");

    // Adiciona o ouvinte ao modal
    modal.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Impede o comportamento padrão do Enter
            savePropostaInputs(); // Chama a função de salvar
        }
    });
}

// Função para fechar modais ao clicar fora do conteúdo
function closeCopyableDataModal() {
    const modal = document.getElementById('copyableDataModal');
    modal.style.display = 'none'; // Fecha a modal
}

// Exibe os resultados da otimização no modal de resultados
    function openOptimizationResultModal(index) {
    const result = optimizationResults[index];
    const inputs = optimizationInputs[index];
    if (!result || !inputs) return;

    const productName = getProductNames()[index];
    const workerHours = inputs.workerHours; // Carga horária diária configurada
    const totalHours = result.totalHours; // Total de horas de trabalho
    const workersNeeded = result.workersNeeded; // Trabalhadores necessários
    const totalShifts = result.totalShifts; // Total de turnos de trabalho
    const minimumProductionTime = result.minimumProductionTime; // Prazo mínimo de produção
    const totalEmploymentPeriod = result.totalEmploymentPeriod; // Período total em que estarão empregados
    const workShift = inputs.nightShift ? "Diurno e Noturno" : "Diurno"; // Verifica o tipo de turno
    const weeklyScale = result.weeklyScale; // Escala semanal
    const factoriesNeeded = result.factoriesNeeded;

    const daysOff = 7 - weeklyScale; // Dias de folga na semana
    const formattedWeeklyScale = `${weeklyScale}X${daysOff}`; // Formata como solicitado

    document.getElementById('optimizationResult').innerHTML = `
        <p><strong>Produto:</strong> ${productName}</p>
        <p><strong>Carga Horária Total:</strong> ${totalHours.toFixed(2)} horas</p>
        <p><strong>Fábricas Necessárias:</strong> ${factoriesNeeded}</p>
        <p><strong>Prazo Mínimo de Produção:</strong> ${formatDays(minimumProductionTime * 24)}</p>
        <p><strong>Turno:</strong> ${workShift}</p>
        <p><strong>Trabalhadores Necessários:</strong> ${workersNeeded}</p>
        <p><strong>Total de Turnos:</strong> ${totalShifts}</p>
        <p><strong>Expediente do Trabalhador:</strong> ${workerHours}h por dia</p>
        <p><strong>Escala de Trabalho:</strong> ${formattedWeeklyScale}</p>
        <p><strong>Período Total de Emprego:</strong> ${totalEmploymentPeriod}</p>
    `;


    const modal = document.getElementById('optimizationResultModal');
    modal.style.display = 'flex';
}

// Função para fechar a modal de resultados de otimização
function closeOptimizationResultModal() {
    document.getElementById('optimizationResultModal').style.display = 'none';
}

