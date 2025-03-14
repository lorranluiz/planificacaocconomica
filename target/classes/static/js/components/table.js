// Função para preencher a tabela com valores iniciais baseados em predefinedValues
function populateInitialTable() {
    const tbody = document.getElementById('inputTechnologicalMatrixTableBody');
    tbody.innerHTML = ''; // Limpa qualquer conteúdo existente na tabela

    const initialRows = 3;
    const initialCols = 3;

    // Atualiza o cabeçalho da tabela
    const thead = document.getElementById('inputTable').querySelector('thead tr');
    thead.innerHTML = '<th>Produtos / Setores Produtivos</th>';
    for (let colIndex = 0; colIndex < initialCols; colIndex++) {
        const sectorHeader = document.createElement('th');
        const sectorInput = document.createElement('input');
        sectorInput.type = 'text';
        sectorInput.value = colIndex < initialRows && productNames[colIndex].includes("Rede") ? productNames[colIndex] : `Produção de ${colIndex < initialRows ? productNames[colIndex] : "Outro"}`;
        sectorInput.readOnly = true; // Define como apenas leitura
        addTooltipBehavior(sectorInput); // Adiciona o comportamento de tooltip
        sectorHeader.appendChild(sectorInput);
        thead.appendChild(sectorHeader);
    }

    // Atualiza as linhas da tabela
    for (let rowIndex = 0; rowIndex < initialRows; rowIndex++) {
        const row = document.createElement('tr');

        // Adicionar o campo de entrada para o nome do produto
        const productNameCell = document.createElement('td');
        const productInput = document.createElement('input');
        productInput.type = 'text';
        productInput.value = productNames[rowIndex];
        productInput.oninput = (e) => updateProductName(rowIndex, e.target.value);
        productNameCell.appendChild(productInput);
        row.appendChild(productNameCell);

        // Adicionar as células restantes
        for (let colIndex = 0; colIndex < initialCols; colIndex++) {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.value = predefinedValues[rowIndex][colIndex];
            cell.appendChild(input);
            addHighlightBehavior(cell); // Adiciona o comportamento de destaque
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }
}

// Função para redimensionar a tabela e preservar dados antigos
function resizeTable() {
    const numRows = parseInt(document.getElementById('numRows').value);
    const numCols = parseInt(document.getElementById('numCols').value);

    const table = document.getElementById('inputTable');
    const tbody = table.querySelector('tbody');
    const thead = table.querySelector('thead');

    // Armazenar os dados antigos antes do redimensionamento
    storePreviousTableData();
    storePreviousDemandValues();

    // Atualiza o cabeçalho da tabela com os nomes dos setores produtivos
    thead.innerHTML = '<tr><th>Produtos / Setor Produtivo</th></tr>';
    for (let j = 0; j < numCols; j++) {
        const sectorHeader = document.createElement('th');
        const sectorInput = document.createElement('input');
        sectorInput.type = 'text';
        sectorInput.value = previousSectorNames[j] || (inputNames[j % inputNames.length].includes('Rede') ? `${inputNames[j % inputNames.length]}` : `Produção de ${inputNames[j % inputNames.length]}`);
        sectorInput.readOnly = true;
        addTooltipBehavior(sectorInput); // Adiciona o comportamento de tooltip
        sectorHeader.appendChild(sectorInput);
        thead.querySelector('tr').appendChild(sectorHeader);
    }

    // Redimensiona o corpo da tabela preservando os dados antigos
    tbody.innerHTML = '';
    for (let i = 0; i < numRows; i++) {
        const row = document.createElement('tr');

        // Nome do produto
        const productNameCell = document.createElement('td');
        const productInput = document.createElement('input');
        productInput.type = 'text';
        productInput.value = previousProductNames[i] || `Produto ${i + 1}`;
        //productInput.onchange = () => syncProductName(i, productInput.value);  // Sincroniza nome de produto
        productInput.oninput = () => updateProductName(i, productInput.value);
        productNameCell.appendChild(productInput);
        row.appendChild(productNameCell);

        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';

            // Preenche com o valor antigo ou usa um valor padrão
            input.value = (previousTableData[i] && previousTableData[i][j] !== undefined)
                ? previousTableData[i][j]
                : predefinedValues[i % predefinedValues.length][j % predefinedValues[0].length];

            input.onchange = storePreviousTableData;
            cell.appendChild(input);
            addHighlightBehavior(cell); // Adiciona o comportamento de destaque
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }

    // Atualiza a seção de demanda final com os nomes dos produtos e valores de demanda preservados
    updateFinalDemand(numRows);

    // Se preenchimento automático estiver habilitado, preenche automaticamente novos campos
    if (document.getElementById('autoFillCheckbox').checked) {
        autoFillTable();
    }

    // Atualiza os dados antigos
    storePreviousTableData();
}

// Função para armazenar os dados antigos da tabela, incluindo nomes dos produtos e setores
function storePreviousTableData() {
    const tbody = document.getElementById('inputTable').querySelector('tbody');
    const thead = document.getElementById('inputTable').querySelector('thead');

    previousTableData = [];
    previousProductNames = [];
    previousSectorNames = [];
    previousDemandValues = []; // Armazenar os valores de demanda

    // Armazena os nomes dos setores
    const sectorHeaders = thead.querySelectorAll('th input');
    sectorHeaders.forEach((input, index) => {
        //if (index > 0) previousSectorNames[index - 1] = input.value;
        if (index >= 0) previousSectorNames[index] = input.value;
    });

    // Armazena os dados da tabela e os nomes dos produtos
    tbody.querySelectorAll('tr').forEach((row, index) => {
        const rowData = [];
        const productInput = row.querySelector('td:first-child input');
        previousProductNames[index] = productInput.value;

        row.querySelectorAll('td:not(:first-child) input').forEach((input) => {
            rowData.push(input.value || 0);
        });
        previousTableData.push(rowData);
    });

    // Armazena os valores de demanda atuais
    const demandInputs = document.querySelectorAll('#finalDemandInputs input[type="number"]');
    demandInputs.forEach(input => previousDemandValues.push(input.value || 0));
}

// Função para atualizar os dados antigos da tabela
function updatePreviousTableData() {
    const tbody = document.getElementById('inputTable').querySelector('tbody');
    previousTableData = [];
    tbody.querySelectorAll('tr').forEach((row) => {
        const rowData = [];
        row.querySelectorAll('input[type="number"]').forEach((input) => {
            rowData.push(input.value || 0);
        });
        previousTableData.push(rowData);
    });
}

function autoFillTable() {
    const rows = document.getElementById('inputTable').querySelectorAll('tbody tr');
    const productNames = ["Automóveis", "Computadores", "Celulares", "Geladeiras", "Televisores"];

    rows.forEach((row, i) => {
        row.cells[0].querySelector('input[type="text"]').value = productNames[i % productNames.length];
        let rowValues = [];
        let sum = 0;

        for (let j = 1; j < row.cells.length; j++) {
            let value = i === j ? (Math.random() * 0.05).toFixed(2) : (Math.random() * 0.1).toFixed(2);
            rowValues.push(parseFloat(value));
            sum += parseFloat(value);
        }

        if (sum >= 1) {
            rowValues = rowValues.map(value => (value / sum * 0.9).toFixed(2));
        }

        rowValues.forEach((value, j) => {
            row.cells[j + 1].querySelector('input[type="number"]').value = value;
        });
    });
}

function getTableData() {
    const tbody = document.querySelector('#inputTable tbody');
    const rows = tbody.querySelectorAll('tr');

    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td:not(:first-child) input[type="number"]');
        return Array.from(cells).map(input => parseFloat(input.value) || 0);
    });
}

function confirmClearTable() {
    const confirmation = confirm("Tem certeza de que deseja limpar a tabela? Todos os dados serão perdidos.");
    if (confirmation) {
        clearTable(); // Chama a função de limpeza se confirmado
    }
}


function clearTable() {
    const rows = document.getElementById('inputTable').querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('input[type="number"]');
        cells.forEach(cell => cell.value = '0');
    });

    // Limpa os valores de demanda e status de otimização
    const demandInputs = document.querySelectorAll('#finalDemandInputs input[type="number"]');
    demandInputs.forEach(input => input.value = '0');
    optimizedStatus = {};  // Resetar o status de otimização

    // Atualiza os botões "Otimizar" para o estado padrão
    const optimizeButtons = document.querySelectorAll('#finalDemandInputs button');
    optimizeButtons.forEach(button => button.style.backgroundColor = '');

    // Limpa os valores nas janelas modais de otimização
    if (document.getElementById('productionGoal')) {
        document.getElementById('productionGoal').value = '';
    }
    document.getElementById('workerLimit').value = '';
    document.getElementById('workerHours').value = '';
    document.getElementById('productionTime').value = '';

    // Limpa os dados de otimização armazenados para cada produto
    optimizationInputs = {};
    optimizationResults = {};

    // Limpa os resultados de "Planificar"
    document.getElementById('result').innerHTML = '';

    // Oculta o título "Planificação Otimizada" e a tabela
    isPlanified = false; // Marca que a planificação foi resetada
    togglePlanificationElements(); // Atualiza visibilidade

    // Limpa campos adicionais conforme solicitado
    document.getElementById('conselhoPopularAssociadoDeConselhoPopular').value = '';
    document.getElementById('quantidadeBensProducao').value = '';
    document.getElementById('setorUnidade').value = '';
    document.getElementById('comiteColTitle').value = '';
    document.getElementById('limiteEfetivoTrabalhadores').value = '';
    document.getElementById('conselhoPopularAssociadoDeComiteOuTrabalhador').value = '';
    document.getElementById('conselhoPopularAssociadoDeComiteOuTrabalhadorTelaTrabalhador').value = '';
    

    // Limpa todos os campos das colunas "Bens de Produção" e "Quantidade necessária para produzir 1 unidade"
    const vetorTecnologicoInputs = document.querySelectorAll('#vetorTecnologicoTable tbody input');
    vetorTecnologicoInputs.forEach(input => input.value = '');

    // Limpa todos os valores das colunas "Bem de Produção", "Estoque" e "Demanda"
    const estoqueDemandaInputs = document.querySelectorAll('#estoqueDemandaTable tbody input');
    estoqueDemandaInputs.forEach(input => input.value = '');

    // Limpa todos os valores da janela modal "Proposta para demais Trabalhadores"
    document.getElementById('workerLimitProposta').value = '';
    document.getElementById('workerHoursProposta').value = '';
    document.getElementById('productionTimeProposta').value = '';
    document.getElementById('nightShiftProposta').checked = false;
    document.getElementById('weeklyScaleProposta').value = '';

    // Limpa os campos das colunas "Produto", "Quantidade Produzida" e "Quantidade que Falta ser Produzida"
    const producaoMetaInputs = document.querySelectorAll('#producaoMetaTable tbody input');
    producaoMetaInputs.forEach(input => input.value = '');

    // Adicionalmente, limpa as variáveis associadas na memória
    previousTableData = [];
    previousProductNames = [];
    previousSectorNames = [];
    previousDemandValues = [];
    propostaDados = {};
    totalSocialWorkDessaJurisdicao = 0;
    councilData = null;
    currentProductIndex = null;
    modalContext = null;
    
    //Limpeza de variáveis e campos da tela de Trabalhador
    document.getElementById('name').value = '';
    document.getElementById('comiteAssociadoDeTrabalhador').value = '';
    document.getElementById('associacaoDeMoradoresAssociadaDeTrabalhador').value = '';
    document.getElementById('hoursAtElectronicPoint').value = '';
    document.getElementById('partipacaoIndividualEstimadaNoTrabalhoSocial').value = '';
    
}

function resizeTableForData(numRows, numCols) {
		document.getElementById('numRows').value = numRows;
		document.getElementById('numCols').value = numCols;
		resizeTable(); // Redimensiona a tabela usando a função existente
	}

    function fillTableWithData(inputTableData) {
		const tbody = document.querySelector('#inputTable tbody');
		const thead = document.querySelector('#inputTable thead tr');

		// Limpa a tabela existente
		tbody.innerHTML = '';
		thead.innerHTML = '<th>Produtos / Setores Produtivos</th>';

		if (inputTableData.length === 0) {
			showNotification("Tabela vazia recebida, nenhuma alteração feita.", false);
			return;
		}

		// Atualiza os cabeçalhos da tabela com base no número de colunas
		const numCols = inputTableData[0].length;
		for (let j = 0; j < numCols; j++) {
			const sectorHeader = document.createElement('th');
			const sectorInput = document.createElement('input');
			sectorInput.type = 'text';
			sectorInput.value = `Setor ${j + 1}`;
			sectorInput.oninput = () => updateSectorName(j, sectorInput.value);
			sectorInput.readOnly = true;
			addTooltipBehavior(sectorInput); // Adiciona o comportamento de tooltip
			sectorHeader.appendChild(sectorInput);
			thead.appendChild(sectorHeader);
		}

		// Preenche a tabela com os dados recebidos
		inputTableData.forEach((row, rowIndex) => {
			const tableRow = document.createElement('tr');

			// Adiciona uma célula para o nome do produto
			const productNameCell = document.createElement('td');
			const productInput = document.createElement('input');
			productInput.type = 'text';
			productInput.value = `Produto ${rowIndex + 1}`;
			productInput.oninput = () => updateProductName(rowIndex, productInput.value);
			productNameCell.appendChild(productInput);
			tableRow.appendChild(productNameCell);

			// Preenche os valores das colunas
			row.forEach(value => {
				const cell = document.createElement('td');
				const input = document.createElement('input');
				input.type = 'number';
				input.value = value || 0;
				cell.appendChild(input);
				addHighlightBehavior(cell); // Adiciona o comportamento de destaque
				tableRow.appendChild(cell);
			});

			tbody.appendChild(tableRow);
		});

		//showNotification("Tabela preenchida com os dados recebidos.", true);
	}

	function updateVetorTecnologicoTable() {
		const quantidadeBensProducao = parseInt(document.getElementById('quantidadeBensProducao').value, 10);
		const table = document.getElementById('vetorTecnologicoTable');
		const tbody = table.querySelector('tbody');
		const productColumnTitle = document.querySelector('#producaoMetaTable tbody tr td:first-child input').value;

		// Salvar os dados antigos da tabela "Vetor Tecnológico"
		const previousData = [];
		tbody.querySelectorAll('tr').forEach((row, rowIndex) => {
			const rowData = [];
			row.querySelectorAll('td input').forEach((input, colIndex) => {
				rowData[colIndex] = input.value; // Armazena o valor da célula
			});
			previousData[rowIndex] = rowData;
		});
		

		// Limpar o conteúdo atual da tabela
		tbody.innerHTML = '';

		// Criar novas linhas preservando dados antigos
		for (let i = 0; i < quantidadeBensProducao; i++) {
			const row = document.createElement('tr');

			// Criar célula do nome do bem de produção
			const productCell = document.createElement('td');
			const productInput = document.createElement('input');
			productInput.type = 'text';
			productInput.value = previousData[i] && previousData[i][0] !== undefined ? previousData[i][0] : `Bem ${i + 1}`;
			productInput.oninput = syncProductionNames; // Atualiza nomes automaticamente
			productCell.appendChild(productInput);
			row.appendChild(productCell);

			// Criar célula do valor tecnológico
			const valueCell = document.createElement('td');
			const valueInput = document.createElement('input');
			valueInput.type = 'number';
			valueInput.value = previousData[i] && previousData[i][1] !== undefined && previousData[i][1] !== ''
				? previousData[i][1]
				: '0'; // Define vazio se não houver valor anterior
			valueCell.appendChild(valueInput);
			row.appendChild(valueCell);

			tbody.appendChild(row);
		}

		// Atualizar a tabela de estoque e demanda preservando dados
		updateEstoqueDemandaTable(quantidadeBensProducao);
		syncProductionNames(); // Sincroniza os nomes iniciais
		
		document.querySelector('#vetorTecnologicoTable thead tr th:nth-child(2)').innerHTML = `Quantidade necessária para produzir 1 unidade de ${productColumnTitle}`;
		
	}


	function updateEstoqueDemandaTable(quantidadeBensProducao) {
		const tableBody = document.querySelector("#estoqueDemandaTable tbody");

		// Salvar os dados existentes antes de limpar a tabela
		const previousData = Array.from(tableBody.querySelectorAll("tr")).map(row => ({
			bemDeProducao: row.cells[0].textContent.trim(),
			estoque: row.cells[1].querySelector("input").value.trim(),
			demanda: row.cells[2].querySelector("input").value.trim()
		}));

		// Limpar a tabela
		tableBody.innerHTML = '';

		// Criar novas linhas preservando dados antigos
		for (let i = 0; i < quantidadeBensProducao; i++) {
			const row = document.createElement('tr');

			// Coluna "Bem de Produção"
			const bemDeProducaoCell = document.createElement('td');
			bemDeProducaoCell.textContent = previousData[i]?.bemDeProducao || `Bem ${i + 1}`;
			row.appendChild(bemDeProducaoCell);

			// Coluna "Estoque"
			const estoqueCell = document.createElement('td');
			const estoqueInput = document.createElement('input');
			estoqueInput.type = 'number';
			estoqueInput.value = previousData[i]?.estoque || 0; // Mantém o valor ou define como 0
			estoqueCell.appendChild(estoqueInput);
			row.appendChild(estoqueCell);

			// Coluna "Demanda"
			const demandaCell = document.createElement('td');
			const demandaInput = document.createElement('input');
			demandaInput.type = 'number';
			demandaInput.value = previousData[i]?.demanda || 0; // Mantém o valor ou define como 0
			demandaCell.appendChild(demandaInput);
			row.appendChild(demandaCell);

			tableBody.appendChild(row);
		}
	}

function addHighlightBehavior(cell) {
    cell.addEventListener('mouseover', () => {
        const table = document.getElementById('inputTable');
        const row = cell.parentElement;
        const cellIndex = Array.from(row.children).indexOf(cell);

        // Destaca a coluna
        Array.from(table.rows).forEach(row => {
            if (row.cells[cellIndex]) {
                row.cells[cellIndex].classList.add('highlight-column');
            }
        });
    });

    cell.addEventListener('mouseout', () => {
        const table = document.getElementById('inputTable');
        const row = cell.parentElement;
        const cellIndex = Array.from(row.children).indexOf(cell);

        // Remove o destaque da coluna
        Array.from(table.rows).forEach(row => {
            if (row.cells[cellIndex]) {
                row.cells[cellIndex].classList.remove('highlight-column');
            }
        });
    });
}

function populateTechMatrix(techMatrix, productNames) {
    const thead = document.getElementById('inputTable').querySelector('thead tr');
    const tbody = document.getElementById('inputTable').querySelector('tbody');

    // Atualizar os títulos das colunas
    thead.innerHTML = '<th>Produtos / Setor Produtivo</th>'; // Redefine o cabeçalho
    productNames.forEach(productName => {
        const sectorHeader = document.createElement('th');
        const sectorInput = document.createElement('input');
        sectorInput.type = 'text';
        sectorInput.value = productName.includes('Rede') ? productName : `Produção de ${productName}`;
        sectorInput.readOnly = true; // Define como apenas leitura
        addTooltipBehavior(sectorInput); // Adiciona o comportamento de tooltip
        sectorHeader.appendChild(sectorInput);
        thead.appendChild(sectorHeader);
    });

    // Atualizar os dados da tabela
    tbody.innerHTML = ''; // Limpa a tabela existente
    techMatrix.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        const productNameCell = document.createElement('td');
        const productInput = document.createElement('input');
        productInput.type = 'text';
        productInput.value = productNames[rowIndex];
        productInput.oninput = () => updateProductName(rowIndex, productInput.value);
        productNameCell.appendChild(productInput);
        tr.appendChild(productNameCell);

        row.forEach(value => {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.value = value;
            cell.appendChild(input);
            addHighlightBehavior(cell); // Adiciona o comportamento de destaque
            tr.appendChild(cell);
        });

        tbody.appendChild(tr);
    });
}

function populateFinalDemand(finalDemand) {
    const demandContainer = document.getElementById('finalDemandInputs');
    demandContainer.innerHTML = ''; // Limpa a tabela antes de preencher

    finalDemand.forEach((demand, index) => {
        const row = document.createElement('tr');

        // Coluna do nome do produto
        const productNameCell = document.createElement('td');
        productNameCell.textContent = getProductNames()[index] || `Produto ${index + 1}`;
        row.appendChild(productNameCell);

        // Entrada de demanda
        const demandInputCell = document.createElement('td');
        const demandInput = document.createElement('input');
        demandInput.type = 'number';
        demandInput.value = demand;
        demandInput.id = `demand${index}`;
        demandInputCell.appendChild(demandInput);
        row.appendChild(demandInputCell);

        // Botão de ação
        const actionCell = document.createElement('td');
        const optimizeButton = document.createElement('button');
        optimizeButton.textContent = 'Otimizar';
        optimizeButton.onclick = () => openOptimizationModal(index); // Reatribuir o evento de clique
        actionCell.appendChild(optimizeButton);
        row.appendChild(actionCell);

        demandContainer.appendChild(row);

        // Atualizar a cor do botão com base no status de otimização
        updateOptimizeButtonColor(index);
    });
}

function updateColumnTitles(productNames) {
    const headerRow = document.getElementById('inputTable').querySelector('thead tr');

    // Ignorar a primeira célula (que contém "Produtos / Setores Produtivos")
    const columnHeaders = headerRow.querySelectorAll('th');

    productNames.forEach((productName, index) => {
        const columnHeader = columnHeaders[index + 1]; // +1 para ignorar a primeira célula
        if (columnHeader) {
            const input = columnHeader.querySelector('input');
            if (input) {
                input.value = productName.includes('Rede') ? productName : `Produção de ${productName}`; // Atualiza o título
                input.readOnly = true; // Configura como somente leitura
                addTooltipBehavior(input); // Adiciona o comportamento de tooltip
            }
        }
    });
}

function synchronizeFinalDemandProducts() {

    const productRows = document.querySelectorAll('#inputTable tbody tr');
        const demandRows = document.querySelectorAll('#finalDemandInputs tr');

        productRows.forEach((productRow, index) => {
            const productName = productRow.querySelector('td:first-child input').value;
            if (demandRows[index]) {
                demandRows[index].querySelector('td:first-child').textContent = productName;
            }
        });
        
}

function syncProductionNames() {
    const vetorRows = document.querySelectorAll('#vetorTecnologicoTable tbody tr');
    const estoqueRows = document.querySelectorAll('#estoqueDemandaTable tbody tr');

    vetorRows.forEach((vetorRow, index) => {
        const productInput = vetorRow.querySelector('td:first-child input');
        const estoqueCell = estoqueRows[index]?.querySelector('td:first-child');

        if (productInput && estoqueCell) {
            estoqueCell.textContent = productInput.value; // Atualiza o nome
        }
    });
}
