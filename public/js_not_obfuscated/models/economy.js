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

let isPlanified = false; // Variável para controlar se a planificação foi feita

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

function saveOptimizationInputsForProduct(productIndex) {
    const inputs = optimizationInputs[productIndex];
    if (!inputs) return;

    // Salva os dados no objeto de otimização
    optimizationInputs[productIndex] = inputs;
    optimizedStatus[productIndex] = true;

    // Atualiza o botão na tabela "Demanda Final"
    updateOptimizeButtonColor(productIndex);

    // Recalcula a otimização para este produto
    performOptimization(productIndex);

    // Atualiza os resultados da "Planificação Otimizada"
    const resultDiv = document.getElementById('result');
    if (resultDiv && resultDiv.innerHTML.trim() !== '') {
        planify(); // Reprocessa os dados da planificação
    }
}

function updateDemandAndGoal() {
	
	
	const confirmation = confirm("Você salvou alterações que tenha feito aqui?");
	if (!confirmation) {
		showNotification("Salve as alterações que fez aqui." ,false);
		return;
	}
	
    // Obter a chave da instância a partir do campo "Conselho Popular Associado:"
    const instanceKey = document.getElementById("conselhoPopularAssociadoDeComiteOuTrabalhador").value.trim();
    const targetProduct = document.querySelector("#producaoMetaTable tbody tr input[type='text']").value.trim();

    if (!instanceKey) {
        console.error("Conselho Popular Associado não preenchido.");
        return;
    }

    fetch(apiUrl, {
		method: 'GET',
		headers: headers
	})
		.then(response => response.json())
		.then(binData => {
            const record = binData || {};
            const instanceData = record[instanceKey];

            if (instanceData) {
                const { optimizationResults, productNames, setorUnidade } = instanceData; //CARREGAR plannedFinalDemand

                // Encontrar índice do produto no vetor "productNames"
                const productIndex = productNames.indexOf(targetProduct);

                if (productIndex !== -1 && optimizationResults) {
                    // Localizar o valor correspondente no vetor "optimizationResults"
					//console.info("optimizationResults: ");
					//console.log(optimizationResults);
					//console.info("productIndex: ");
					//console.log(productIndex);
                    const requiredProduction = optimizationResults[productIndex].plannedFinalDemand;

					//console.info("requiredProduction: ");
					//console.log(requiredProduction);

                    // Filtrar as unidades de produção do setor atual
                    const filteredRecords = Object.values(record).filter(item =>
                        item.conselhoPopularAssociadoDeComiteOuTrabalhador === instanceKey &&
                        item.setorUnidade === (targetProduct.includes('Rede') ? targetProduct : `Produção de ${targetProduct}`)
                    );

                    // Calcular o totalEffectiveWorkersLimit
                    let totalEffectiveWorkersLimit = 0;
                    filteredRecords.forEach(productionUnit => {
                        if (productionUnit.limiteEfetivoTrabalhadores) {
                            totalEffectiveWorkersLimit += parseInt(productionUnit.limiteEfetivoTrabalhadores, 10);
                        }
                    });

                    if (totalEffectiveWorkersLimit === 0) {
                        console.error("Nenhum trabalhador efetivo encontrado nas unidades de produção filtradas.");
                        return;
                    }

                    // Obter o totalEffectiveWorkers da interface
                    const totalEffectiveWorkers = parseFloat(document.getElementById("limiteEfetivoTrabalhadores").value.trim()) || 0;

                    // Calcular o peso da unidade de produção
                    const productionUnitWeight = totalEffectiveWorkers / totalEffectiveWorkersLimit;

					let sociallyDeterminedProductionGoal = productionUnitWeight*requiredProduction;
					//console.info("requiredProduction: ");
					//console.log(requiredProduction);
					let producedQuantity = 5;
					let pendingProductionQuantity = ((sociallyDeterminedProductionGoal-producedQuantity*1000)/1000).toFixed(3); //divide por 1000 só pra dar a ordem de grandeza, mas pode mudar isso
					
					document.getElementById("pendingProductionQuantity").value = pendingProductionQuantity;

					// Adição: Iteração nas tabelas "Estoque e Demanda" e "Vetor Tecnológico"
                    const stockDemandTable = document.querySelector("#estoqueDemandaTable tbody");
                    const techVectorTable = document.querySelector("#vetorTecnologicoTable tbody");

                    if (stockDemandTable && techVectorTable) {
                        const stockRows = stockDemandTable.rows;
                        const techRows = techVectorTable.rows;

                        for (let i = 0; i < stockRows.length && i < techRows.length; i++) {
                            // Obter valores das colunas relevantes
                            const quantidadeDeUmBemDeProducao = parseFloat(techRows[i].cells[1].querySelector("input").value) || 0;
                            const estoqueDeUmBemDeProducao = parseFloat(stockRows[i].cells[1].querySelector("input").value) || 0;

                            // Calcular demanda de um bem de produção
                            const demandaDeUmBemDeProducao = 
                                quantidadeDeUmBemDeProducao * pendingProductionQuantity - estoqueDeUmBemDeProducao;

                            // Atualizar a coluna correspondente na tabela "Estoque e Demanda"
                            stockRows[i].cells[2].querySelector("input").value = demandaDeUmBemDeProducao.toFixed(3);
                        }
                    }

                    // Exibir os resultados no console
                    console.log("Required production to meet final demand:", requiredProduction);
                    console.log("Total Effective Workers Limit:", totalEffectiveWorkersLimit);
                    console.log("Production Unit Weight:", productionUnitWeight);
					console.log("sociallyDeterminedProductionGoal:", sociallyDeterminedProductionGoal);
					console.log("producedQuantity:", producedQuantity);
					console.log("pendingProductionQuantity:", pendingProductionQuantity);
					
					
					
					
                } else {
                    console.error("Produto ou demanda final não encontrada.");
                }
            } else {
                console.error("Nenhum dado encontrado para a instância:", instanceKey);
            }
        })
        .catch(err => console.error("Erro ao carregar dados do JSONBin:", err));

    // Rolar para o final da página
    scrollToEndOfPage();
}

