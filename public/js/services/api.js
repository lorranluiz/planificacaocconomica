// Dados para salvar e carregar os dados online
const endpoint = "data";
//const apiKey = 'ixYIiBIuxiS68RgTT7qYB50K3jOiUKMK9bQFPjAcRd';
//let apiUrl = `https://api.jsonsilo.com/${endpoint}`;
let apiUrl = `${window.location.origin}/jsonServer/${endpoint}`;

// Headers para a requisição
const headers = {
    'Content-Type': 'application/json'
};

// Proxy
//const proxyUrl = "https://api.allorigins.win/raw?url=";
//apiUrl = proxyUrl + encodeURIComponent(apiUrl);

function fetchDataFromJsonBin() {

    // Reseta os dados anteriores antes de carregar novos dados
    previousTableData = [];

    if (!userIsLoggedIn || !user) {
        showNotification("Você precisa estar logado para receber dados.", false);
        return;
    }

    // Limpa os dados antigos antes de carregar novos
    optimizationInputs = {};
    optimizationResults = {};
    optimizedStatus = {};

    const instanceKey = user.instancePrepositionJurisdictionUUID;

    fetch(apiUrl, {
        method: 'GET',
        headers: headers
    })
        .then(response => response.json())
        .then(binData => {
            const record = binData || {};
            const instanceData = record[instanceKey];

            if(user.instancePrepositionJurisdictionUUID.includes("WorkerUUID")){
                //Trabalhador não conselheiro
                document.getElementById("name").value = user.name;
                generateQRCode(user.uuid);
            }

            if (instanceData) {

                // Obter dimensões da matriz tecnológica
                const numProducts = instanceData.productNames?.length || 0;
                const numSectors = instanceData.sectorNames?.length || 0;

                // Atualizar os campos "Número de produtos" e "Número de Setores Produtivos"
                document.getElementById('numRows').value = numProducts;
                document.getElementById('numCols').value = numSectors;

                if(!record[conselhoMundialKey]){
                    showNotification("Cadastre um Conselho Popular Mundial.", false);
                }

                totalSocialWork = record[conselhoMundialKey]?.totalSocialWorkDessaJurisdicao || "Ainda não há registro mundial de trabalho social total.";
                worldSectorNames = record[conselhoMundialKey]?.sectorNames || "Ainda não há registro mundial de setores de produção.";

                // Executar a função de redimensionar tabela
                resizeTable();

                fillTableWithData(instanceData.inputTable || []);
                setProductNames(instanceData.productNames || []);
                setSectorNames(instanceData.sectorNames || []);
                setFinalDemand(instanceData.finalDemand || []);
                optimizationInputs = instanceData.optimizationInputs || {};
                optimizationResults = instanceData.optimizationResults || {};

                synchronizeFinalDemandProducts();
                updateAllOptimizeButtons();
                planify(); // Executa a planificação automaticamente após carregar os dados
                showNotification("Dados recebidos com sucesso!", true);

                if(user.instancePrepositionJurisdictionUUID.includes("WorkerUUID")){
                    //Trabalhador não conselheiro

                    document.getElementById("conselhoPopularAssociadoDeComiteOuTrabalhadorTelaTrabalhador").value = instanceData.conselhoPopularAssociadoDeComiteOuTrabalhador;
                    document.getElementById("comiteAssociadoDeTrabalhador").value = instanceData.comiteAssociadoDeTrabalhador;
                    document.getElementById("associacaoDeMoradoresAssociadaDeTrabalhador").value = instanceData.associacaoDeMoradoresAssociadaDeTrabalhador;
                    document.getElementById("hoursAtElectronicPoint").value = Number(instanceData.hoursAtElectronicPoint);
                    //document.getElementById("totalSocialWork").value = totalSocialWork;
                    
                    console.log(`hoursAtElectronicPoint/totalSocialWork: ${instanceData.hoursAtElectronicPoint}/${totalSocialWork} = ${instanceData.hoursAtElectronicPoint/totalSocialWork}`);
                    
                    document.getElementById("partipacaoIndividualEstimadaNoTrabalhoSocial").value = ((instanceData.hoursAtElectronicPoint/totalSocialWork)*Number("1e13")).toFixed(2);
                    
                    plannedDistribution(worldSectorNames);

                }

                // Ajustar o campo "Setor"
                if (instanceData.setorUnidade) {
                    document.getElementById("setorUnidade").value = instanceData.setorUnidade;
                }

                // Carregar os novos campos da seção "Informações da Unidade Produtiva"
                if (instanceData.limiteEfetivoTrabalhadores !== undefined) {
                    document.getElementById("limiteEfetivoTrabalhadores").value = instanceData.limiteEfetivoTrabalhadores;
                }

                if (instanceData.conselhoPopularAssociadoDeComiteOuTrabalhador !== undefined) {
                    document.getElementById("conselhoPopularAssociadoDeComiteOuTrabalhador").value = instanceData.conselhoPopularAssociadoDeComiteOuTrabalhador;
                }

                // Carregar conselhoPopularAssociadoDeConselhoPopular a seção "Tamanho da Economia"
                if (instanceData.conselhoPopularAssociadoDeConselhoPopular !== undefined) {
                    document.getElementById("conselhoPopularAssociadoDeConselhoPopular").value = instanceData.conselhoPopularAssociadoDeConselhoPopular;
                }

                // Ajustar "Quantidade de Bens de Produção" e popula "Estoque e Demanda"
                if (instanceData.estoqueDemanda) {
                    const estoqueDemandaBody = document.querySelector("#estoqueDemandaTable tbody");
                    const requiredRows = instanceData.estoqueDemanda.length;

                    document.getElementById('quantidadeBensProducao').value = requiredRows;

                    if (estoqueDemandaBody) {
                        estoqueDemandaBody.innerHTML = ""; // Limpa a tabela

                        instanceData.estoqueDemanda.forEach((item, index) => {
                            const row = document.createElement("tr");

                            const bemCell = document.createElement("td");
                            bemCell.textContent = item.bemDeProducao || `Bem ${index + 1}`;

                            const estoqueCell = document.createElement("td");
                            const estoqueInput = document.createElement("input");
                            estoqueInput.type = "number";
                            estoqueInput.value = item.estoque || 0;
                            estoqueCell.appendChild(estoqueInput);

                            const demandaCell = document.createElement("td");
                            const demandaInput = document.createElement("input");
                            demandaInput.type = "number";
                            demandaInput.value = item.demanda || 0;
                            demandaInput.readOnly = true;
                            demandaCell.appendChild(demandaInput);

                            row.appendChild(bemCell);
                            row.appendChild(estoqueCell);
                            row.appendChild(demandaCell);
                            estoqueDemandaBody.appendChild(row);
                        });
                    }
                }

                // Ajustar a tabela "Vetor Tecnológico"
                if (instanceData.estoqueDemanda) {
                    const vetorTecnologicoBody = document.querySelector("#vetorTecnologicoTable tbody");
                    const estoqueDemandaBody = document.querySelector("#estoqueDemandaTable tbody");
                    const requiredRows = instanceData.estoqueDemanda.length;

                    if (vetorTecnologicoBody && estoqueDemandaBody) {
                        vetorTecnologicoBody.innerHTML = ""; // Limpa a tabela

                        instanceData.estoqueDemanda.forEach((item, index) => {
                            const row = document.createElement("tr");

                            // Coluna: Nome do Produto (Bem de Produção)
                            const bemDeProducaoCell = document.createElement("td");
                            const bemInput = document.createElement("input");
                            bemInput.type = "text";
                            bemInput.value = item.bemDeProducao || `Bem ${index + 1}`;

                            // Sincroniza com a tabela "Estoque e Demanda"
                            bemInput.addEventListener("input", () => {
                                const estoqueRow = estoqueDemandaBody.querySelectorAll("tr")[index];
                                if (estoqueRow) {
                                    const bemCell = estoqueRow.querySelector("td:first-child");
                                    if (bemCell) {
                                        bemCell.textContent = bemInput.value;
                                    }
                                }
                            });

                            bemDeProducaoCell.appendChild(bemInput);

                            // Coluna: Valor (inicializa com 0 ou valor carregado)
                            const valorCell = document.createElement("td");
                            const valorInput = document.createElement("input");
                            valorInput.type = "number";
                            valorInput.value = instanceData.vetorTecnologico?.[index] || 0;
                            valorCell.appendChild(valorInput);

                            row.appendChild(bemDeProducaoCell);
                            row.appendChild(valorCell);
                            vetorTecnologicoBody.appendChild(row);
                        });
                    }
                }

                // Carregar o título do comitê
                if (instanceData.comiteColTitle) {
                    document.getElementById("comiteColTitle").value = instanceData.comiteColTitle;
                }

                // Carregar dados do modal "Proposta para demais Trabalhadores"
                if (instanceData.propostaTrabalhadores) {
                    propostaDados = instanceData.propostaTrabalhadores;

                    document.getElementById("workerLimitProposta").value = propostaDados.workerLimit || 0;
                    document.getElementById("workerHoursProposta").value = propostaDados.workerHours || 0;
                    document.getElementById("productionTimeProposta").value = propostaDados.productionTime || 0;
                    document.getElementById("nightShiftProposta").checked = propostaDados.nightShift || false;
                    document.getElementById("weeklyScaleProposta").value = propostaDados.weeklyScale || 0;
                }

                // Carregar dados da tabela "Produção e Meta"
                if (instanceData.producaoMeta) {
                    
                    const producaoMetaBody = document.querySelector("#producaoMetaTable tbody");
                    producaoMetaBody.innerHTML = ""; // Limpa a tabela

                    instanceData.producaoMeta.forEach((item, index) => {
                        const row = document.createElement("tr");

                        // Coluna: Produto
                        const produtoCell = document.createElement("td");
                        const produtoInput = document.createElement("input");
                        produtoInput.type = "text";
                        produtoInput.value = item.produto || `Produto ${index + 1}`;
                        produtoCell.appendChild(produtoInput);

                        // Coluna: Quantidade Produzida
                        const quantidadeProduzidaCell = document.createElement("td");
                        const quantidadeProduzidaInput = document.createElement("input");
                        quantidadeProduzidaInput.type = "number";
                        quantidadeProduzidaInput.id = "producedQuantity";
                        quantidadeProduzidaInput.value = parseFloat(item.quantidadeProduzida).toFixed(3) || 0;
                        quantidadeProduzidaCell.appendChild(quantidadeProduzidaInput);

                        // Coluna: Quantidade Meta
                        const quantidadeMetaCell = document.createElement("td");
                        const quantidadeMetaInput = document.createElement("input");
                        quantidadeMetaInput.type = "number";
                        quantidadeMetaInput.value = item.quantidadeMeta || 0;
                        quantidadeMetaInput.id = "pendingProductionQuantity";
                        quantidadeMetaInput.readOnly = true;
                        quantidadeMetaCell.appendChild(quantidadeMetaInput);

                        // Coluna: Planejamento (botão)
                        const planejamentoCell = document.createElement("td");
                        const planejamentoButton = document.createElement("button");
                        planejamentoButton.className = "btn";
                        planejamentoButton.textContent = "Planejamento";
                        planejamentoButton.onclick = () => openProducaoMetaModal();
                        planejamentoCell.appendChild(planejamentoButton);

                        // Adiciona as células à linha
                        row.appendChild(produtoCell);
                        row.appendChild(quantidadeProduzidaCell);
                        row.appendChild(quantidadeMetaCell);
                        row.appendChild(planejamentoCell);

                        // Adiciona a linha ao corpo da tabela
                        producaoMetaBody.appendChild(row);

                        // Inicializa o evento e executa a atualização inicial
                        produtoInput.addEventListener('input', atualizarTituloColunaVetorTecnologico);
                        atualizarTituloColunaVetorTecnologico(); // Atualiza o título na inicialização
                    });
                
                    // Carregue os dados e atribua às variáveis
                     
                     const produtoInput = document.querySelector('#producaoMetaTable tbody tr td:first-child input');
                     
                    const limiteEfetivoTrabalhadores = document.getElementById("limiteEfetivoTrabalhadores").value.trim();
                    const comiteColTitle = instanceData.comiteColTitle;
                    const productName = produtoInput.value || "Produto";
                    const minimumProductionTime = instanceData.producaoMeta; //ver se vou ter que somar tudo pra tirar a media ponderada como fiz antes. multiplicar o valor do setor pelo peso pra ter a proporção pra essa fabrica.
                    const workShift = instanceData.workShift;
                    const workerHours = instanceData.workerHours;
                    const weeklyScale = instanceData.weeklyScale;
                    const totalEmploymentPeriod = instanceData.totalEmploymentPeriod;
                    
                    
                } else {
                    console.error("Nenhum dado encontrado para a instância:", instanceKey);
                }

            } else {
                showNotification("Nenhum dado encontrado para sua instância.", false);
            }
        })
        .catch(err => console.error("Erro ao receber dados do JSONBin:", err));
}

function sendDataToJsonBin() {
    if (!userIsLoggedIn || !user) {
        showNotification("Você precisa estar logado para enviar dados.", false);
        return;
    }

    const instanceKey = user.instancePrepositionJurisdictionUUID;

    const setorUnidade = document.getElementById("setorUnidade").value.trim();

    const estoqueDemandaData = [];
    document.querySelectorAll("#estoqueDemandaTable tbody tr").forEach(row => {
        const bemDeProducao = row.cells[0].textContent.trim();
        const estoque = row.cells[1].querySelector("input").value.trim();
        const demanda = row.cells[2].querySelector("input").value.trim();
        estoqueDemandaData.push({ bemDeProducao, estoque, demanda });
    });

    const producaoMetaData = [];
    document.querySelectorAll("#producaoMetaTable tbody tr").forEach(row => {
        const produto = row.cells[0].querySelector("input").value.trim();
        const quantidadeProduzida = row.cells[1].querySelector("input").value.trim();
        const quantidadeMeta = row.cells[2].querySelector("input").value.trim();
        producaoMetaData.push({ produto, quantidadeProduzida, quantidadeMeta });
    });

    const comiteColTitle = document.getElementById("comiteColTitle").value.trim();

    //De Trabalhadores
    const comiteAssociadoDeTrabalhador = document.getElementById("comiteAssociadoDeTrabalhador").value.trim();
    const associacaoDeMoradoresAssociadaDeTrabalhador = document.getElementById("associacaoDeMoradoresAssociadaDeTrabalhador").value.trim();
    const hoursAtElectronicPoint = Number(document.getElementById("hoursAtElectronicPoint").value)
    
    console.log(`hoursAtElectronicPoint/totalSocialWork: ${hoursAtElectronicPoint}/${totalSocialWork} = ${hoursAtElectronicPoint/totalSocialWork}`);
    
    const partipacaoIndividualEstimadaNoTrabalhoSocial = hoursAtElectronicPoint/totalSocialWork;   //document.getElementById("partipacaoIndividualEstimadaNoTrabalhoSocial").value.concat("e-13")); //quando exibir na tela exibe multiplicado por esse valor
    
    //-----------

    const propostaTrabalhadoresData = { ...propostaDados };

    // Coleta os dados da segunda coluna da tabela "Vetor Tecnológico"
    const vetorTecnologicoData = [];
    document.querySelectorAll("#vetorTecnologicoTable tbody tr").forEach(row => {
        const secondColumnInput = row.cells[1]?.querySelector("input");
        if (secondColumnInput) {
            vetorTecnologicoData.push(secondColumnInput.value.trim());
        }
    });

    // Coleta os novos campos da seção "Informações da Unidade Produtiva"
    const limiteEfetivoTrabalhadores = document.getElementById("limiteEfetivoTrabalhadores").value.trim();
    
    let conselhoPopularAssociadoDeComiteOuTrabalhadorData;
    
    if(user.instancePrepositionJurisdictionUUID.includes("WorkerUUID")){
        conselhoPopularAssociadoDeComiteOuTrabalhadorData = document.getElementById("conselhoPopularAssociadoDeComiteOuTrabalhadorTelaTrabalhador").value.trim();
    } else{
        conselhoPopularAssociadoDeComiteOuTrabalhadorData = document.getElementById("conselhoPopularAssociadoDeComiteOuTrabalhador").value.trim();
    }

    // Coleta o campo da seção "Tamanho da Economia"
    const conselhoPopularAssociadoDeConselhoPopular = document.getElementById("conselhoPopularAssociadoDeConselhoPopular").value.trim();

    const dataToSave = {
        inputTable: getTableData(),
        productNames: getProductNames(),
        sectorNames: getSectorNames(),
        finalDemand: getFinalDemand(),
        optimizationInputs,
        optimizationResults,
        setorUnidade,
        limiteEfetivoTrabalhadores, // Novo campo da seção "Informações da Unidade Produtiva"
        conselhoPopularAssociadoDeComiteOuTrabalhador: conselhoPopularAssociadoDeComiteOuTrabalhadorData,
        conselhoPopularAssociadoDeConselhoPopular, // Novo campo da seção "Tamanho da Economia"
        estoqueDemanda: estoqueDemandaData,
        producaoMeta: producaoMetaData,
        comiteColTitle,
        propostaTrabalhadores: propostaTrabalhadoresData,
        vetorTecnologico: vetorTecnologicoData, // Adiciona os dados coletados
        totalSocialWorkDessaJurisdicao, // Valor padrão inicial
        comiteAssociadoDeTrabalhador,
        associacaoDeMoradoresAssociadaDeTrabalhador,
        partipacaoIndividualEstimadaNoTrabalhoSocial,
        hoursAtElectronicPoint,
        effectivelyPlannedProductionTime
    };

    fetch(apiUrl, {
        method: 'GET',
        headers: headers
    })
        .then(response => response.json())
        .then(binData => {
            const record = binData || {};
            record[instanceKey] = { ...record[instanceKey], ...dataToSave };

            return fetch(apiUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(record)
            });
        })
        .then(() => showNotification("Dados enviados com sucesso!", true))
        .catch(err => console.error("Erro ao enviar dados:", err));
}

document.getElementById("sendDataButton").addEventListener("click", sendDataToJsonBin);

// Suponha um botão para restaurar dados
document.getElementById("fetchDataButton").addEventListener("click", () => {
    const binId = "67454301e41b4d34e45ab292"; //binID dos dados que se deseja restaurar
    if (binId) {
        fetchDataFromJsonBin(binId);
    }
});

function restoreDataFromJSON(data) {
    try {
    
        // Determina o número de produtos e setores com base nos dados recebidos
        const numRows = data.productNames.length;
        const numCols = data.techMatrix[0]?.length || 0;

        // Atualiza os valores dos inputs do Tamanho da Economia
        document.getElementById('numRows').value = numRows;
        document.getElementById('numCols').value = numCols;

        // Redimensiona a tabela principal
        resizeTable();

        // Preenche os dados recebidos na interface
        const tbody = document.getElementById('inputTechnologicalMatrixTableBody');
        tbody.innerHTML = '';

        data.productNames.forEach((name, rowIndex) => {
            const row = document.createElement('tr');

            // Nome do produto
            const productNameCell = document.createElement('td');
            const productInput = document.createElement('input');
            productInput.type = 'text';
            productInput.value = name;
            productInput.oninput = (e) => updateProductName(rowIndex, e.target.value);
            productNameCell.appendChild(productInput);
            row.appendChild(productNameCell);

            // Dados da Matriz Tecnológica
            data.techMatrix[rowIndex].forEach(value => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                cell.appendChild(input);
                addHighlightBehavior(cell); // Adiciona o comportamento de destaque
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        // Atualiza a tabela de Demanda Final
        const demandInputsContainer = document.getElementById('finalDemandInputs');
        demandInputsContainer.innerHTML = '';

        data.finalDemand.forEach((value, index) => {
            const demandRow = document.createElement('tr');

            // Nome do produto
            const productNameCell = document.createElement('td');
            productNameCell.textContent = data.productNames[index];
            demandRow.appendChild(productNameCell);

            // Valor da demanda
            const demandInputCell = document.createElement('td');
            const demandInput = document.createElement('input');
            demandInput.type = 'number';
            demandInput.value = value;
            demandInput.id = `demand${index}`;
            demandInputCell.appendChild(demandInput);
            demandRow.appendChild(demandInputCell);

            // Botão de otimização
            const buttonCell = document.createElement('td');
            const button = document.createElement('button');
            button.textContent = 'Otimizar';
            button.onclick = () => openOptimizationModal(index);
            buttonCell.appendChild(button);
            demandRow.appendChild(buttonCell);

            demandInputsContainer.appendChild(demandRow);
        });

        // Preenche os dados de "Parâmetros de Otimização" para os produtos
        Object.keys(data.optimizationInputs).forEach(index => {
            const productIndex = parseInt(index, 10);
            const inputs = data.optimizationInputs[productIndex];

            if (inputs) {
                optimizationInputs[productIndex] = {
                    workerLimit: inputs.workerLimit || 0,
                    workerHours: inputs.workerHours || 0,
                    productionTime: inputs.productionTime || 0,
                    nightShift: inputs.nightShift || false,
                    weeklyScale: inputs.weeklyScale || 0
                };
            }
        });

        // Atualiza o status de otimização e os botões
        Object.keys(optimizationInputs).forEach(index => {
            const productIndex = parseInt(index, 10);
            const hasOptimization = isOptimizationDataComplete(productIndex);
            optimizedStatus[productIndex] = hasOptimization; // Define o status
            updateOptimizeButtonColor(productIndex); // Atualiza a cor do botão
        });

        console.info('Dados restaurados com sucesso!');
        
        // Chama a função planify automaticamente após carregar os dados
        planify();
        
    } catch (error) {
        console.error('Erro ao restaurar os dados:', error);
    }
}

function collectAllData() {
    // Obter nomes dos produtos
    const productNames = getProductNames();

    // Obter dados da tabela "Matriz Tecnológica"
    const techMatrix = getTableData();

    // Obter dados da tabela "Demanda Final"
    const finalDemand = getFinalDemand();
    
    const instancePrepositionJurisdictionUUID = user.instancePrepositionJurisdictionUUID;

    return {
        productNames,       // Nomes dos produtos
        techMatrix,         // Dados da Matriz Tecnológica
        finalDemand,        // Dados da Demanda Final
        optimizationInputs, // Configurações de otimização (objeto global)
        optimizationResults, // Resultados da planificação (objeto global)
        instancePrepositionJurisdictionUUID			//Instância + Preposição + Jurisdição
    };
}

function createSearchRow(tableBody, items, isProducao) {
    // Criar linha de busca
    const searchRow = document.createElement("tr");
    const searchCell = document.createElement("td");
    const searchContainer = document.createElement("div");
    searchContainer.style.position = "relative";
    searchContainer.style.alignContent = "center";
    searchContainer.style.alignItems = "center";
    searchContainer.style.justifyContent = "center";
    searchContainer.style.alignSelf = "center";
    searchContainer.style.width = "500px";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Digite para buscar...";
    
    // Criar dropdown para autocomplete
    const dropdown = document.createElement("div");
    dropdown.style.cssText = `
        position: absolute;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(100, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-top: none;
        z-index: 1000;
        display: none;
    `;

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(dropdown);
    searchCell.appendChild(searchContainer);
    searchRow.appendChild(searchCell);
    searchRow.appendChild(document.createElement("td")); // Célula vazia para alinhamento
    tableBody.appendChild(searchRow);

    // Array para armazenar itens já adicionados
    //Por algum motivo essa mesma função em @plannedDistribution.js se chamada aqui não funciona corretamente, mesmo ajustando os parâmetros.
    //Por isso está duplicada, existe aqui e lá.
    function addItemToTable(item) {
        if (addedItems.has(item)) return;
        
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        const removeBtn = document.createElement("span");
        removeBtn.textContent = "[-] ";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.color = "red";
        removeBtn.onclick = () => {
            row.remove();
            addedItems.delete(item);
        };
        
        const itemName = item.includes("Produção") ? item.replace("Produção de ", "") : item;
        nameCell.appendChild(removeBtn);
        nameCell.appendChild(document.createTextNode(itemName));

        const demandaCell = document.createElement("td");
        const demandaInput = document.createElement("input");
        demandaInput.type = "number";
        demandaInput.value = 1;
        demandaCell.appendChild(demandaInput);

        row.appendChild(nameCell);
        row.appendChild(demandaCell);
        tableBody.appendChild(row);
        addedItems.add(item);
    }

    // Atualizar dropdown com sugestões
    function updateDropdown(searchText) {
        const suggestions = items.filter(item => 
            !addedItems.has(item) && 
            (item.toLowerCase().includes(searchText.toLowerCase()) || 
             item.replace("Produção de ", "").toLowerCase().includes(searchText.toLowerCase()))
        );

        if (suggestions.length > 0 && searchText) {
            dropdown.innerHTML = "";
            dropdown.style.display = "block";
            
            suggestions.forEach(suggestion => {
                const div = document.createElement("div");
                div.textContent = suggestion.includes("Produção") ? 
                    suggestion.replace("Produção de ", "") : 
                    suggestion;
                div.style.cssText = `
                    padding: 8px;
                    cursor: pointer;
                    hover: background-color: rgba(255, 255, 255, 0.6);
                `;
                div.onmouseover = () => div.style.backgroundColor = rgba(255, 255, 255, 0.6);
                div.onmouseout = () => div.style.backgroundColor = rgba(100, 0, 0, 0.5);
                div.onclick = () => {
                    addItemToTable(suggestion);
                    searchInput.value = "";
                    dropdown.style.display = "none";
                };
                dropdown.appendChild(div);
            });
        } else {
            dropdown.style.display = "none";
        }
    }

    // Event listeners
    searchInput.addEventListener("input", (e) => {
        updateDropdown(e.target.value);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && dropdown.children.length > 0) {
            const firstSuggestion = dropdown.children[0].textContent;
            const originalItem = items.find(item => 
                item.includes("Produção") ? 
                item.replace("Produção de ", "") === firstSuggestion : 
                item === firstSuggestion
            );
            if (originalItem) {
                addItemToTable(originalItem);
                searchInput.value = "";
                dropdown.style.display = "none";
            }
        }
    });

    // Fechar dropdown quando clicar fora
    document.addEventListener("click", (e) => {
        if (!searchContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}
