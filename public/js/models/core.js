function planify() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = "";

    try {
        const techMatrix = makeSquareMatrix(getTableData());
        const adjustedDemand = adjustDemandVector(getFinalDemand(), techMatrix.length);
        const identityMatrix = math.identity(techMatrix.length)._data;
        const iMinusA = math.subtract(identityMatrix, techMatrix);
        const inverseIMinusA = math.inv(iMinusA);
        const productionVector = math.multiply(inverseIMinusA, adjustedDemand);

        const productNames = getProductNames();
        resultDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Produção Necessária para Atender a Demanda Final (mil)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${productionVector.map((val, i) => {
                        const hasOptimization = isOptimizationDataComplete(i); // Validação aqui
                        return `
                            <tr>
                                <td>${productNames[i]}</td>
                                <td>${val.toFixed(2)}</td>
                                <td>
                                    ${hasOptimization ? 
                                    `<button onclick="openOptimizationResultModal(${i})">Otimização</button>` : 
                                    `<button disabled>Otimização Não Disponível</button>`}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Define a meta de produção e executa a otimização para cada produto com dados completos
        productionVector.forEach((value, index) => {
            if (isOptimizationDataComplete(index)) {
                optimizationInputs[index].productionGoal = value * 1000; // Define a meta
                performOptimization(index); // Executa a otimização
                updateOptimizeButtonColor(index); // Atualiza o botão após a otimização
            }
        });

        // Formatação da matriz e vetor para exibição
        const formattedMatrix = JSON.stringify(techMatrix, null, 2);
        const formattedVector = JSON.stringify(adjustedDemand, null, 2);

        // Preenche os elementos na modal
        document.getElementById('matrixModalOutput').textContent = formattedMatrix;
        document.getElementById('vectorModalOutput').textContent = formattedVector;

        // Marca que a planificação foi feita e exibe o título e o botão
        isPlanified = true;
        togglePlanificationElements();

        // Rolagem suave para o título "Planificação Otimizada"
        const planificationTitle = document.getElementById('planificationTitle'); // Seleciona o título "Planificação Otimizada"
        const infobar = document.getElementById('infoBar'); // Seleciona a infobar

        if (planificationTitle) {
            const infobarHeight = infobar ? infobar.offsetHeight : 0; // Calcula a altura da infobar
            const planificationTitlePosition = planificationTitle.getBoundingClientRect().top + window.scrollY; // Posição do título na página
            const targetPosition = planificationTitlePosition - infobarHeight; // Compensa a altura da infobar

            // Rola suavemente para a posição ajustada
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth',
            });
        }


    } catch (error) {
        resultDiv.innerHTML = `<p class="error-message">Erro: ${error.message}</p>`;
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

function performOptimization(productIndex) {
    const inputs = optimizationInputs[productIndex];
    if (!inputs) return;

    const { productionGoal, workerLimit, workerHours, productionTime, weeklyScale, nightShift } = inputs;

    if (!workerLimit || workerLimit <= 0) {
        const productName = getProductNames()[productIndex];
        //showNotification(`O limite de trabalhadores por fábrica não foi configurado corretamente para a produção de ${productName}.`);
        return;
    }

    // Cálculo total de horas necessárias para produzir a quantidade desejada
    const totalHours = productionTime * productionGoal;

    // Capacidade semanal por trabalhador (em horas)
    const weeklyWorkHoursPerWorker = weeklyScale * workerHours;

    // Cálculo do número de trabalhadores necessários
    const workersNeeded = Math.ceil(totalHours / weeklyWorkHoursPerWorker);

    // Capacidade total de trabalho por turno (independente de ser diurno ou noturno)
    const shiftWorkHours = workerLimit * workerHours;

    // Total de turnos necessários
    const totalShifts = Math.ceil(totalHours / shiftWorkHours);

    // Capacidade diária considerando escala semanal e turno noturno
    const dailyWorkHours = nightShift ? shiftWorkHours * 2 : shiftWorkHours;
    const totalDailyWorkHours = dailyWorkHours * weeklyScale / 7;

    // Prazo mínimo de produção em dias
    const minimumProductionTime = Math.ceil(totalHours / totalDailyWorkHours);

    // Período total de trabalho (em semanas e dias restantes)
    const totalWorkDays = Math.ceil(totalHours / dailyWorkHours);
    const totalWeeks = Math.floor(totalWorkDays / weeklyScale);
    const remainingDays = totalWorkDays % weeklyScale;

    // Cálculo das horas de operação por dia
    const factoryOperationHours = nightShift ? 24 : 12;

    // Conversão do prazo mínimo de produção para dias
    const minimumProductionTimeInDays = minimumProductionTime / 24; // Considera 1 dia = 24 horas

    // Nova fórmula para calcular o número de fábricas necessárias
    const factoriesNeeded = Math.ceil(totalHours / (factoryOperationHours * workerLimit * minimumProductionTimeInDays));



    // Cálculo da quantidade de fábricas
    //const factoriesNeeded = Math.ceil(totalHours / shiftWorkHours);

    // Formatação do período total de emprego
    let totalEmploymentPeriod;
    if (totalWorkDays < weeklyScale) {
        totalEmploymentPeriod = `${totalWorkDays} dias`;
    } else {
        totalEmploymentPeriod = formatDays(totalWorkDays * 24); // Converte dias em horas para formatDays
    }

    const table = document.querySelector('#result table'); // Seleciona a tabela "Planificação Otimizada"
    const row = table?.rows[productIndex + 1]; // Seleciona a linha correspondente ao índice (ajusta para ignorar cabeçalho)
    const plannedFinalDemand = row ? parseFloat(row.cells[1].textContent.trim())*1000 : 0; // Acessa a célula da coluna correspondente e converte o valor

    // Armazenamento dos resultados para exibição
    optimizationResults[productIndex] = {
        totalHours,
        workersNeeded,
        factoriesNeeded, // Adiciona o cálculo das fábricas
        totalShifts,
        minimumProductionTime,
        totalEmploymentPeriod,
        weeklyScale,
        plannedFinalDemand
    };
}