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
    
    // Captura os valores dos campos com conversão explícita para números
    const workerLimitValue = document.getElementById('workerLimit').value.trim();
    const workerHoursValue = document.getElementById('workerHours').value.trim();
    const productionTimeValue = document.getElementById('productionTime').value.trim();
    const weeklyScaleValue = document.getElementById('weeklyScale').value.trim();
    const nightShift = document.getElementById('nightShift').checked;
    
    // Conversão para números, garantindo que não sejam NaN
    const workerLimit = workerLimitValue ? parseInt(workerLimitValue) : 100;
    const workerHours = workerHoursValue ? parseFloat(workerHoursValue) : 8;
    const productionTime = productionTimeValue ? parseFloat(productionTimeValue) : 1;
    const weeklyScale = weeklyScaleValue ? parseInt(weeklyScaleValue) : 5;
    
    // Validação mais rigorosa
    if (isNaN(workerLimit) || workerLimit <= 0) {
        showError('O limite de trabalhadores deve ser um número maior que zero.');
        return;
    }
    
    if (isNaN(workerHours) || workerHours <= 0) {
        showError('As horas de trabalho devem ser um número maior que zero.');
        return;
    }
    
    if (isNaN(productionTime) || productionTime <= 0) {
        showError('O tempo de produção deve ser um número maior que zero.');
        return;
    }
    
    if (isNaN(weeklyScale) || weeklyScale < 1 || weeklyScale > 7) {
        showError('A escala semanal deve ser um número entre 1 e 7 dias.');
        return;
    }
    
    // Cria a configuração com valores verificados
    const config = {
        workerLimit,
        workerHours,
        productionTime,
        weeklyScale,
        nightShift,
        materializationId: productIds[currentOptimizationProductIndex]
    };
    
    // Log de debug explícito
    console.log('Config a ser enviada:', {
        ...config,
        instanceId: currentInstanceId,
        productName: productNames[currentOptimizationProductIndex]
    });
    
    // Mostrar indicador de carregamento
    document.getElementById('optimizationModalSpinner').style.display = 'inline-block';
    
    // Salva no servidor
    saveOptimizationConfigToServer(config)
        .then(() => {
            document.getElementById('optimizationModalSpinner').style.display = 'none';
            closeOptimizationConfigModal();
            showSuccess('Configuração salva com sucesso!');
        })
        .catch(err => {
            document.getElementById('optimizationModalSpinner').style.display = 'none';
            console.error('Erro detalhado:', err);
        });
}

// Função para exibir detalhes de otimização
function openOptimizationResultModal(index) {
    // Obter o resultado de otimização correspondente
    const result = optimizationResults[index];
    
    console.log('Abrindo modal de resultado para índice:', index);
    console.log('Resultado disponível:', result);
    
    if (!result) {
        showError('Resultado de otimização não disponível para este produto');
        return;
    }
    
    // Preencher dados na modal - título do produto
    document.getElementById('optimizationModalProductName').textContent = result.productName || 'Produto';
    
    // Formatar valores numéricos com verificação de existência
    const formatNumber = (value, decimals = 2) => {
        if (value === undefined || value === null) return '0';
        return typeof value === 'number' ? value.toFixed(decimals) : '0';
    };
    
    // Criar o conteúdo HTML estruturado em seções
    let contentHTML = `
        <div class="optimization-section">
            <h4>Dados de Produção</h4>
            <p><strong>Produção Necessária:</strong> ${formatNumber(result.productionNeeded)} unidades</p>
            <p><strong>Total de Horas Necessárias:</strong> ${formatNumber(result.totalHours)} horas</p>
        </div>
        
        <div class="optimization-section">
            <h4>Parâmetros Configurados</h4>
            <p><strong>Limite de Trabalhadores por Fábrica:</strong> ${result.workerLimit || '0'}</p>
            <p><strong>Horas de Trabalho por Dia:</strong> ${formatNumber(result.workerHours, 1)} horas</p>
            <p><strong>Tempo para Produzir Uma Unidade:</strong> ${formatNumber(result.productionTime, 4)} horas</p>
            <p><strong>Escala Semanal:</strong> ${formatNumber(result.weeklyScale, 0)} dias por semana</p>
            <p><strong>Turno Noturno:</strong> ${result.nightShift ? 'Sim' : 'Não'}</p>
        </div>
        
        <div class="optimization-section">
            <h4>Resultados Calculados</h4>
            <p><strong>Trabalhadores Necessários:</strong> ${result.workersNeeded ? Math.ceil(result.workersNeeded) : '0'} trabalhadores</p>
            <p><strong>Fábricas Necessárias:</strong> ${result.factoriesNeeded ? Math.ceil(result.factoriesNeeded) : '0'} fábricas</p>
            <p><strong>Tempo Mínimo de Produção:</strong> ${formatNumber(result.minimumProductionTimeInDays, 1)} dias</p>
            <p><strong>Horas de Operação da Fábrica:</strong> ${formatNumber(result.factoryOperationHours)} horas por dia</p>
        </div>
    `;
    
    document.getElementById('optimizationModalContent').innerHTML = contentHTML;
    
    // Adicionar estilos na modal para melhorar a exibição
    const style = document.createElement('style');
    style.textContent = `
        #optimizationResultModal .modal-content {
            max-height: 90vh;
            overflow-y: auto;
            padding: 20px;
        }
        
        .optimization-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--card-bg, #f9f9f9);
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .optimization-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: var(--accent-color, #3498db);
            font-size: 16px;
        }
    `;
    
    // Remover estilo anterior se existir
    const oldStyle = document.getElementById('optimization-modal-style');
    if (oldStyle) oldStyle.remove();
    
    // Adicionar ID ao novo estilo para facilitar remoção futura
    style.id = 'optimization-modal-style';
    document.head.appendChild(style);
    
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
    if (!currentInstanceId) {
        showError('ID da instância não definido. Selecione uma instância primeiro.');
        return Promise.reject(new Error('ID da instância não definido'));
    }
    
    if (!config.materializationId) {
        showError('ID da materialização social não definido.');
        return Promise.reject(new Error('ID da materialização social não definido'));
    }
    
    // Payload simplificado e com valores convertidos explicitamente
    const payload = {
        instanceId: Number(currentInstanceId),
        materializationId: Number(config.materializationId),
        workerLimit: Number(config.workerLimit),
        workerHours: Number(config.workerHours),
        productionTime: Number(config.productionTime),
        weeklyScale: Number(config.weeklyScale),
        nightShift: Boolean(config.nightShift)
    };
    
    console.log('Dados exatos enviados ao servidor:', JSON.stringify(payload));
    
    return fetch('/api/planification/optimization-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Resposta de erro completa:', text);
                
                try {
                    const errorJson = JSON.parse(text);
                    throw new Error(`Erro HTTP: ${response.status} - ${errorJson.message || 'Erro desconhecido'}`);
                } catch (e) {
                    throw new Error(`Erro HTTP: ${response.status} - ${text || 'Sem detalhes'}`);
                }
            });
        }
        return response.json();
    })
    .then(data => {
        // Cache os dados retornados
        optimizationConfigs[currentOptimizationProductIndex] = data;
        return data;
    });
}

// Função para exibir mensagem de erro
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover após alguns segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Função para exibir mensagem de sucesso
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover após alguns segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Verificar se o cabeçalho já foi inserido
function ensureHeader() {
    if (!document.querySelector('.nav-container')) {
        insertCommonHeader();
    }
}

// Adicione esta função para atualizar valores do vetor demanda a partir da interface
function updateDemandVectorFromUI() {
    const demandTable = document.getElementById('demandVector');
    const tbody = demandTable.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    // Limpar o vetor de demanda atual
    demandVector = [];
    
    // Ler os valores atualizados da interface
    rows.forEach((row, index) => {
        const inputElement = row.querySelector('input');
        if (inputElement) {
            // Converter para número, garantindo que seja um valor válido
            const value = parseFloat(inputElement.value) || 0;
            demandVector.push(value);
        }
    });
    
    console.log('Vetor de demanda atualizado:', demandVector);
    return demandVector;
}

// Mantém o restante do código dentro do evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar cabeçalho comum - APENAS UMA VEZ
    ensureHeader();
    
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
        
        // Adicionar linhas com valores
        demandVector.forEach((value, index) => {
            const row = document.createElement('tr');
            const hasConfig = optimizationConfigs[index] !== undefined;
            row.innerHTML = `
                <td>${productNames[index]}</td>
                <td>
                    <input type="number" step="0.01" min="0" value="${value}" 
                           onchange="updateDemandVector(${index}, this.value)" />
                </td>
                <td>
                    <button class="btn btn-sm ${hasConfig ? 'btn-success' : ''}" onclick="openOptimizationConfigModal(${index})">
                        <i class="fas fa-cogs"></i> ${hasConfig ? 'Editar' : 'Configurar'} Otimização
                    </button>
                </td>
            `;
            demandVectorTable.querySelector('tbody').appendChild(row);
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
     * Executa o processo de planificação
     */
    async function performPlanification() {
        if (!currentInstanceId) {
            showError('Selecione uma instância para continuar.');
            return;
        }
        
        // IMPORTANTE: Atualizar o vetor de demanda a partir da interface ANTES do cálculo
        updateDemandVectorFromUI();
        
        // Mostrar spinner de carregamento
        loadingSpinner.style.display = 'inline-block';
        
        try {
            // Primeiro passo: Carregar todas as configurações de otimização para esta instância
            const configsResponse = await fetch(`/api/planification/optimization-config/by-instance/${currentInstanceId}`);
            if (!configsResponse.ok) {
                throw new Error('Erro ao carregar configurações de otimização');
            }
            
            const configsData = await configsResponse.json();
            console.log('Configurações carregadas do servidor:', configsData);
            
            // Mapear as configurações por ID de materialização para fácil acesso
            const configsById = {};
            configsData.forEach(config => {
                configsById[config.materializationId] = config;
            });
            
            // Segundo passo: Preparar a matriz e vetor para a planificação
            const matrixInput = technologicalMatrix.map(row => [...row]);
            const vectorInput = [...demandVector];
            
            // Terceiro passo: Executar a planificação no servidor
            const response = await fetch('/api/planification/planify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instanceId: currentInstanceId,
                    technologicalMatrix: matrixInput,
                    demandVector: vectorInput,
                    productNames: productNames,
                    materializationIds: productIds
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao executar a planificação');
            }
            
            const data = await response.json();
            console.log('Resultado da planificação:', data);
            
            // Armazenar o vetor de produção e resultados de otimização
            const productionVector = data.productionVector;
            optimizationResults = data.optimizationResults || [];
            
            // Atualizar a interface com os resultados
            renderProductionVector(productionVector);
            
            // Exibir a seção de resultados
            resultsContainer.style.display = 'block';
            
            // Rolar para a seção de resultados
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Erro durante a planificação:', error);
            showError(`Erro durante a planificação: ${error.message}`);
        } finally {
            // Esconder spinner de carregamento
            loadingSpinner.style.display = 'none';
        }
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
        
        // Adicionar linhas com valores
        productionVector.forEach((value, index) => {
            const row = document.createElement('tr');
            
            // Verificar se temos resultados de otimização para este produto
            const hasOptimizationResults = optimizationResults && 
                                          optimizationResults.length > index && 
                                          optimizationResults[index] !== null;
            
            const buttonHTML = hasOptimizationResults
                ? `<button class="btn btn-sm" onclick="openOptimizationResultModal(${index})">
                     <i class="fas fa-chart-line"></i> Ver Detalhes
                   </button>`
                : `<button class="btn btn-sm" disabled>
                     <i class="fas fa-exclamation-circle"></i> Sem Dados
                   </button>`;
            
            row.innerHTML = `
                <td>${productNames[index]}</td>
                <td>${value.toFixed(2)}</td>
                <td>${buttonHTML}</td>
            `;
            
            productionVectorTable.querySelector('tbody').appendChild(row);
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
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remover após alguns segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    /**
     * Exibe mensagem de sucesso
     */
    function showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remover após alguns segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
});