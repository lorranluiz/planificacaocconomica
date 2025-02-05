let isPlanified = false; // Variável para controlar se a planificação foi feita

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

