// Script para controlar a página de planificação econômica

// Declarar variáveis globalmente
let currentInstanceId = null;
let productNames = [];
let productIds = [];
let technologicalMatrix = [];
let demandVector = [];
let currentOptimizationProductIndex = -1;
const optimizationConfigs = {};
let optimizationResults = [];

// Funções de manipulação das modais precisam ser globais para serem acessíveis pelos botões
function openOptimizationConfigModal(productIndex) {
    currentOptimizationProductIndex = productIndex;
        
    // Define o nome do produto no modal
    document.getElementById('optimizationModalProductName').textContent = productNames[productIndex];
    
    // Carregar dados existentes para esta materialização específica
    const materializationId = productIds[productIndex];
    
    // Mostrar spinner de carregamento
    document.getElementById('optimizationModalSpinner').style.display = 'inline-block';
    
    // Se já temos em cache, usamos diretamente
    if (optimizationConfigs[productIndex]) {
        fillOptimizationModalWithData(optimizationConfigs[productIndex]);
        document.getElementById('optimizationModalSpinner').style.display = 'none';
        // Exibe a modal
        document.getElementById('optimizationConfigModal').style.display = 'flex';
        return;
    }
    
    // Caso contrário, carregamos do servidor
    fetch(`/api/planification/optimization-config/${currentInstanceId}/${materializationId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // Não encontrou configuração - usa valores padrão
                    return {};
                }
                throw new Error('Erro ao carregar configuração de otimização');
            }
            return response.json();
        })
        .then(config => {
            // Armazena em cache
            optimizationConfigs[productIndex] = config;
            // Preenche os campos
            fillOptimizationModalWithData(config);
        })
        .catch(error => {
            console.error('Erro ao carregar configuração:', error);
            showError('Erro ao carregar configuração: ' + error.message);
        })
        .finally(() => {
            // Esconde spinner
            document.getElementById('optimizationModalSpinner').style.display = 'none';
            // Exibe a modal
            document.getElementById('optimizationConfigModal').style.display = 'flex';
        });
}

function closeOptimizationConfigModal() {
    document.getElementById('optimizationConfigModal').style.display = 'none';
    currentOptimizationProductIndex = -1;
}

function saveOptimizationConfig() {
    if (currentOptimizationProductIndex < 0) return;
    
    // Captura os valores dos campos
    const workerLimit = parseInt(document.getElementById('workerLimit').value) || null;
    const workerHours = parseFloat(document.getElementById('workerHours').value) || null;
    const productionTime = parseFloat(document.getElementById('productionTime').value) || null;
    const weeklyScale = parseInt(document.getElementById('weeklyScale').value) || null;
    const nightShift = document.getElementById('nightShift').checked;
    
    // Validação básica
    if (!workerLimit || !workerHours || !productionTime || !weeklyScale) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    // Cria a configuração
    const config = {
        workerLimit,
        workerHours,
        productionTime,
        weeklyScale,
        nightShift,
        materializationId: productIds[currentOptimizationProductIndex]
    };
    
    // Armazena localmente
    optimizationConfigs[currentOptimizationProductIndex] = config;
    
    // Salva no servidor
    saveOptimizationConfigToServer(config);
    
    // Fecha a modal
    closeOptimizationConfigModal();
    
    // Feedback para o usuário
    showSuccess('Configuração de otimização salva com sucesso!');
}

function openOptimizationResultModal(index) {
    // Obter o resultado de otimização correspondente
    const result = optimizationResults[index];
    if (!result) {
        showError('Resultado de otimização não disponível para este produto');
        return;
    }
    
    // Preencher dados na modal
    document.getElementById('optimizationModalProductName').textContent = result.productName;
    document.getElementById('optimizationModalContent').innerHTML = `
        <p><strong>Produção Necessária:</strong> ${result.productionNeeded.toFixed(2)} unidades</p>
        <p><strong>Total de Horas:</strong> ${result.totalHours.toFixed(2)} horas</p>
        <p><strong>Trabalhadores Necessários:</strong> ${Math.ceil(result.workersNeeded)} trabalhadores</p>
        <p><strong>Fábricas Necessárias:</strong> ${Math.ceil(result.factoriesNeeded)} fábricas</p>
        <p><strong>Escala Semanal:</strong> ${result.weeklyScale} dias por semana</p>
        <p><strong>Horas por Trabalhador:</strong> ${result.workerHours} horas por dia</p>
        <p><strong>Limite de Trabalhadores por Fábrica:</strong> ${result.workerLimit} trabalhadores</p>
        <p><strong>Tempo para Produzir Uma Unidade:</strong> ${result.productionTime.toFixed(2)} horas</p>
        <p><strong>Tempo Mínimo de Produção:</strong> ${result.minimumProductionTimeInDays.toFixed(2)} dias</p>
    `;
    
    // Exibir a modal
    document.getElementById('optimizationResultModal').style.display = 'flex';
}

function closeOptimizationResultModal() {
    document.getElementById('optimizationResultModal').style.display = 'none';
}

function fillOptimizationModalWithData(config) {
    document.getElementById('workerLimit').value = config.workerLimit || '';
    document.getElementById('workerHours').value = config.workerHours || '';
    document.getElementById('productionTime').value = config.productionTime || '';
    document.getElementById('weeklyScale').value = config.weeklyScale || '';
    document.getElementById('nightShift').checked = config.nightShift || false;
}

function saveOptimizationConfigToServer(config) {
    fetch('/api/planification/optimization-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instanceId: currentInstanceId,
            materializationId: config.materializationId,
            workerLimit: config.workerLimit,
            workerHours: config.workerHours,
            productionTime: config.productionTime,
            weeklyScale: config.weeklyScale,
            nightShift: config.nightShift
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar configuração');
        }
        return response.json();
    })
    .then(data => {
        console.log('Configuração salva com sucesso:', data);
    })
    .catch(error => {
        console.error('Erro ao salvar configuração:', error);
        showError('Erro ao salvar configuração: ' + error.message);
    });
}

// Mantém o restante do código dentro do evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar cabeçalho comum
    insertCommonHeader();

    // Elementos principais da interface
    const instanceSelect = document.getElementById('instanceSelect');
    const matrixSection = document.getElementById('matrixSection');
    const technologicalMatrixTable = document.getElementById('technologicalMatrix');
    const demandVectorTable = document.getElementById('demandVector');
    const planifyButton = document.getElementById('planifyButton');
    const saveButton = document.getElementById('saveButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsContainer = document.getElementById('results');
    const productionVectorTable = document.getElementById('productionVector');
    const optimizationResultsTable = document.getElementById('optimizationResults');
    
    // Carregar lista de instâncias
    loadInstances();
    
    // Configurar eventos
    instanceSelect.addEventListener('change', handleInstanceChange);
    planifyButton.addEventListener('click', performPlanification);
    saveButton.addEventListener('click', saveChanges);
    
    /**
     * Carrega a lista de instâncias disponíveis
     */
    function loadInstances() {
        fetch('/api/planification/instances')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar instâncias');
                }
                return response.json();
            })
            .then(instances => {
                // Limpar opções existentes
                while (instanceSelect.options.length > 1) {
                    instanceSelect.remove(1);
                }
                
                // Adicionar novas opções
                instances.forEach(instance => {
                    const option = document.createElement('option');
                    option.value = instance.id;
                    option.textContent = instance.name;
                    instanceSelect.appendChild(option);
                });
            })
            .catch(error => {
                showError('Erro ao carregar instâncias: ' + error.message);
            });
    }
    
    /**
     * Manipula a mudança de instância selecionada
     */
    function handleInstanceChange() {
        const instanceId = instanceSelect.value;
        
        if (!instanceId) {
            matrixSection.style.display = 'none';
            resultsContainer.style.display = 'none';
            return;
        }
        
        currentInstanceId = instanceId;
        
        // Carregar dados da instância
        Promise.all([
            loadTechnologicalMatrix(instanceId),
            loadDemandVector(instanceId)
        ])
        .then(() => {
            // Mostrar seção da matriz
            matrixSection.style.display = 'block';
            // Esconder resultados
            resultsContainer.style.display = 'none';
        })
        .catch(error => {
            showError('Erro ao carregar dados da instância: ' + error.message);
        });
    }
    
    /**
     * Carrega a matriz tecnológica da instância selecionada
     */
    function loadTechnologicalMatrix(instanceId) {
        return fetch(`/api/planification/instances/${instanceId}/technological-matrix`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar matriz tecnológica');
                }
                return response.json();
            })
            .then(data => {
                technologicalMatrix = data.matrix;
                productNames = data.productNames;
                productIds = data.productIds;
                
                // Renderizar a matriz na tabela
                renderTechnologicalMatrix();
            });
    }
    
    /**
     * Carrega o vetor de demanda da instância selecionada
     */
    function loadDemandVector(instanceId) {
        return fetch(`/api/planification/instances/${instanceId}/demand-vector`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar vetor de demanda');
                }
                return response.json();
            })
            .then(data => {
                demandVector = data.vector;
                
                // Renderizar o vetor na tabela
                renderDemandVector();
            });
    }
    
    /**
     * Renderiza a matriz tecnológica na tabela HTML
     */
    function renderTechnologicalMatrix() {
        if (!technologicalMatrix || !productNames) return;
        
        // Limpar tabela
        technologicalMatrixTable.querySelector('thead tr').innerHTML = '<th></th>';
        technologicalMatrixTable.querySelector('tbody').innerHTML = '';
        
        // Adicionar cabeçalhos de colunas
        productNames.forEach(name => {
            const th = document.createElement('th');
            th.textContent = name;
            technologicalMatrixTable.querySelector('thead tr').appendChild(th);
        });
        
        // Adicionar linhas com valores
        technologicalMatrix.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Adicionar nome do produto como primeira célula
            const headerCell = document.createElement('th');
            headerCell.textContent = productNames[rowIndex];
            tr.appendChild(headerCell);
            
            // Adicionar valores da matriz
            row.forEach((value, colIndex) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.step = '0.01';
                input.value = value;
                input.dataset.row = rowIndex;
                input.dataset.col = colIndex;
                input.addEventListener('change', function() {
                    technologicalMatrix[rowIndex][colIndex] = parseFloat(this.value) || 0;
                });
                td.appendChild(input);
                tr.appendChild(td);
            });
            
            technologicalMatrixTable.querySelector('tbody').appendChild(tr);
        });
    }
    
    /**
     * Renderiza o vetor de demanda na tabela HTML
     */
    function renderDemandVector() {
        if (!demandVector || !productNames) return;
        
        // Limpar tabela
        demandVectorTable.querySelector('tbody').innerHTML = '';
        
        // Modificar cabeçalhos para incluir a coluna de ação
        demandVectorTable.querySelector('thead tr').innerHTML = `
            <th>Materialização Social</th>
            <th>Demanda Final</th>
            <th>Ação</th>
        `;
        
        // Carregar configurações de otimização existentes para esta instância
        loadOptimizationConfigs()
            .then(() => {
                // Adicionar linhas com valores
                demandVector.forEach((value, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${productNames[index]}</td>
                        <td>
                            <input type="number" step="0.01" min="0" value="${value}" 
                                   onchange="updateDemandVector(${index}, this.value)" />
                        </td>
                        <td>
                            <button class="btn btn-sm" onclick="openOptimizationConfigModal(${index})">
                                <i class="fas fa-cogs"></i> ${hasOptimizationConfig(index) ? 'Editar' : 'Configurar'} Otimização
                            </button>
                        </td>
                    `;
                    demandVectorTable.querySelector('tbody').appendChild(row);
                });
            });
    }

    /**
     * Carrega configurações de otimização existentes para a instância atual
     */
    function loadOptimizationConfigs() {
        if (!currentInstanceId) {
            return Promise.resolve();
        }
        
        return fetch(`/api/planification/optimization-config/by-instance/${currentInstanceId}`)
            .then(response => {
                if (!response.ok) {
                    return [];
                }
                return response.json();
            })
            .then(configs => {
                // Mapear configurações por ID de materialização
                configs.forEach(config => {
                    const productIndex = productIds.findIndex(id => id === config.materializationId);
                    if (productIndex >= 0) {
                        optimizationConfigs[productIndex] = config;
                    }
                });
            })
            .catch(error => {
                console.error('Erro ao carregar configurações de otimização:', error);
                return [];
            });
    }

    /**
     * Verifica se existe configuração de otimização para o produto
     */
    function hasOptimizationConfig(productIndex) {
        return optimizationConfigs[productIndex] !== undefined;
    }
    
    /**
     * Executa o cálculo de planificação
     */
    function performPlanification() {
        if (!currentInstanceId) {
            showError('Selecione uma instância primeiro');
            return;
        }
        
        // Mostrar spinner de carregamento
        loadingSpinner.style.display = 'inline-block';
        planifyButton.disabled = true;
        
        // Preparar requisição
        const requestData = {
            instanceId: parseInt(currentInstanceId),
            technologicalMatrix: technologicalMatrix,
            demandVector: demandVector,
            productNames: productNames,
            materializationIds: productIds
        };
        
        // Enviar requisição
        fetch('/api/planification/planify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao calcular planificação');
            }
            return response.json();
        })
        .then(result => {
            // Renderizar resultados
            renderResults(result);
            
            // Rolar para os resultados
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            showError('Erro ao calcular planificação: ' + error.message);
        })
        .finally(() => {
            // Ocultar spinner de carregamento
            loadingSpinner.style.display = 'none';
            planifyButton.disabled = false;
        });
    }
    
    /**
     * Renderiza os resultados da planificação
     */
    function renderResults(result) {
        // Mostrar container de resultados
        resultsContainer.style.display = 'block';
        
        // Renderizar vetor de produção
        renderProductionVector(result.productionVector);
        
        // Renderizar resultados da otimização
        renderOptimizationResults(result.optimizationResults);
    }
    
    /**
     * Renderiza o vetor de produção
     */
    function renderProductionVector(productionVector) {
        // Limpar tabela
        productionVectorTable.querySelector('tbody').innerHTML = '';
        
        // Adicionar cabeçalhos incluindo a coluna de ação
        productionVectorTable.querySelector('thead tr').innerHTML = `
            <th>Materialização Social</th>
            <th>Produção Necessária</th>
            <th>Otimização</th>
        `;
        
        // Adicionar linhas com valores
        productionVector.forEach((value, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${productNames[index]}</td>
                <td>${value.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm" onclick="openOptimizationResultModal(${index})">
                        <i class="fas fa-chart-line"></i> Ver Detalhes
                    </button>
                </td>
            `;
            productionVectorTable.querySelector('tbody').appendChild(row);
        });
    }

    /**
     * Renderiza os resultados da otimização
     */
    function renderOptimizationResults(results) {
        // Limpar tabela
        optimizationResultsTable.querySelector('tbody').innerHTML = '';
        
        // Adicionar linhas com valores
        results.forEach(result => {
            const tr = document.createElement('tr');
            
            // Adicionar nome do produto
            const tdName = document.createElement('td');
            tdName.textContent = result.productName;
            tr.appendChild(tdName);
            
            // Adicionar número de trabalhadores
            const tdWorkers = document.createElement('td');
            tdWorkers.textContent = result.workersNeeded ? result.workersNeeded.toFixed(0) : 'N/D';
            tr.appendChild(tdWorkers);
            
            // Adicionar número de fábricas
            const tdFactories = document.createElement('td');
            tdFactories.textContent = result.factoriesNeeded ? result.factoriesNeeded.toFixed(2) : 'N/D';
            tr.appendChild(tdFactories);
            
            optimizationResultsTable.querySelector('tbody').appendChild(tr);
        });
    }
    
    /**
     * Salva as alterações na matriz e no vetor de demanda
     */
    function saveChanges() {
        if (!currentInstanceId) {
            showError('Selecione uma instância primeiro');
            return;
        }
        
        // Mostrar spinner de carregamento
        loadingSpinner.style.display = 'inline-block';
        saveButton.disabled = true;
        
        // Array de promessas para salvar todos os tensores
        const promises = [];
        
        // Salvar cada elemento da matriz tecnológica
        technologicalMatrix.forEach((row, inputIndex) => {
            row.forEach((value, outputIndex) => {
                if (value > 0) {  // Só salva valores positivos
                    const tensor = {
                        instanceId: parseInt(currentInstanceId),
                        inputMaterializationId: productIds[inputIndex],
                        outputMaterializationId: productIds[outputIndex],
                        quantity: value
                    };
                    
                    promises.push(
                        fetch('/api/planification/technological-tensor', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(tensor)
                        })
                    );
                }
            });
        });
        
        // Salvar cada elemento do vetor de demanda
        demandVector.forEach((value, index) => {
            if (value > 0) {  // Só salva valores positivos
                const demandVectorItem = {
                    instanceId: parseInt(currentInstanceId),
                    materializationId: productIds[index],
                    quantity: value
                };
                
                promises.push(
                    fetch('/api/planification/demand-vector', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(demandVectorItem)
                    })
                );
            }
        });
        
        // Aguardar todas as requisições completarem
        Promise.all(promises)
            .then(() => {
                showSuccess('Dados salvos com sucesso!');
            })
            .catch(error => {
                showError('Erro ao salvar dados: ' + error.message);
            })
            .finally(() => {
                // Ocultar spinner de carregamento
                loadingSpinner.style.display = 'none';
                saveButton.disabled = false;
            });
    }
    
    /**
     * Exibe mensagem de erro
     */
    function showError(message) {
        // Implementação simples: alerta
        alert('Erro: ' + message);
    }
    
    /**
     * Exibe mensagem de sucesso
     */
    function showSuccess(message) {
        // Em vez de apenas um alerta
        // alert(message);
        
        // Crie um elemento de notificação mais elegante
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remova após alguns segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
});