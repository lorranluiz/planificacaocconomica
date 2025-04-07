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

// Adicione esta função após a declaração de variáveis no início do arquivo
function loadPreviousResults(instanceId) {
    console.log(`Carregando resultados anteriores da instância ${instanceId}...`);
    
    // Mostrar spinner
    document.getElementById('loadingSpinner').style.display = 'inline-block';
    
    fetch(`/api/planification/previous-results/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('Nenhum resultado anterior encontrado para esta instância');
                    return null;
                }
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Esconder spinner independentemente do resultado
            document.getElementById('loadingSpinner').style.display = 'none';
            
            if (!data) return; // Se não há dados, não faz nada
            
            console.log('Resultados anteriores carregados:', data);
            
            // Verificar se temos um vetor de produção válido
            if (data.productionVector && data.productionVector.length > 0) {
                // Armazenar os resultados
                optimizationResults = data.optimizationResults || [];
                
                // Renderizar a tabela de produção
                renderProductionVector(data.productionVector);
                
                // Mostrar a seção de resultados
                document.getElementById('results').style.display = 'block';
                
                // Adicionar uma mensagem informativa
                const infoContainer = document.createElement('div');
                infoContainer.className = 'info-message success-message';
                infoContainer.innerHTML = `
                    <p><i class="fas fa-info-circle"></i> Exibindo resultados da planificação anterior. 
                    Você pode ajustar os valores e clicar em "Planificar" para recalcular.</p>
                `;
                
                // Verificar se já existe uma mensagem similar para evitar duplicação
                const existingMessage = document.querySelector('.success-message');
                if (!existingMessage) {
                    const resultsElement = document.getElementById('results');
                    resultsElement.parentNode.insertBefore(infoContainer, resultsElement);
                    
                    // Remover após alguns segundos
                    setTimeout(() => {
                        if (infoContainer.parentNode) {
                            infoContainer.remove();
                        }
                    }, 8000);
                }
            }
        })
        .catch(error => {
            console.error('Erro ao carregar resultados anteriores:', error);
            document.getElementById('loadingSpinner').style.display = 'none';
            // Não exibir erro ao usuário, apenas log
        });
}

// Funções de manipulação das modais precisam ser globais para serem acessíveis pelos botões
function openOptimizationConfigModal(productIndex) {
    // Validar o índice antes de prosseguir
    if (!validateProductIndex(productIndex)) {
        showError('Índice de produto inválido. Recarregue a página e tente novamente.');
        return;
    }
    
    currentOptimizationProductIndex = productIndex;
        
    // Define o nome do produto no modal
    document.getElementById('optimizationModalProductName').textContent = productNames[productIndex];
    
    // Carregar dados existentes para esta materialização específica
    const materializationId = productIds[productIndex];
    
    // Verificar se o ID da materialização é válido
    if (!materializationId) {
        console.error(`ID de materialização indefinido para índice: ${productIndex}`);
        showError('ID de materialização não disponível para este produto.');
        return;
    }
    
    // Verificar se o ID da instância é válido
    if (!currentInstanceId) {
        console.error('ID da instância não definido');
        showError('Selecione uma instância antes de configurar a otimização.');
        return;
    }
    
    // Mostrar spinner de carregamento
    document.getElementById('optimizationModalSpinner').style.display = 'inline-block';
    
    // Se já temos em cache, usamos diretamente
    if (optimizationConfigs[productIndex]) {
        fillOptimizationModalWithData(optimizationConfigs[productIndex]);
        document.getElementById('optimizationModalSpinner').style.display = 'none';
        document.getElementById('optimizationConfigModal').style.display = 'block';
        return;
    }
    
    // Caso contrário, carregamos do servidor
    console.log(`Carregando config para instância ${currentInstanceId}, materialização ${materializationId}`);
    
    fetch(`/api/planification/instances/${currentInstanceId}/optimization/${materializationId}`)
        .then(response => {
            // Não lançar erro se status não for 2xx, apenas logar no console
            if (!response.ok) {
                console.warn(`Resposta não OK (${response.status}) ao carregar configuração`);
            }
            return response.json();
        })
        .then(config => {
            // Validar se recebemos um objeto de configuração válido
            if (!config || typeof config !== 'object') {
                throw new Error('Formato de resposta inválido');
            }
            
            // Armazenar no cache (mesmo que sejam valores padrão)
            optimizationConfigs[productIndex] = config;
            
            // Preencher o modal com os dados recebidos
            fillOptimizationModalWithData(config);
            
            // Mostrar o modal
            document.getElementById('optimizationConfigModal').style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao carregar configuração:', error);
            // Em caso de erro, ainda exibimos o modal, mas com valores padrão
            const defaultConfig = {
                workerLimit: 100,
                workerHours: 8.0,
                productionTime: 1.0,
                weeklyScale: 5,
                nightShift: false,
                materializationId: materializationId
            };
            
            // Armazenar os valores padrão no cache para evitar chamadas repetidas
            optimizationConfigs[productIndex] = defaultConfig;
            
            // Preencher o modal com valores padrão
            fillOptimizationModalWithData(defaultConfig);
            document.getElementById('optimizationConfigModal').style.display = 'block';
        })
        .finally(() => {
            document.getElementById('optimizationModalSpinner').style.display = 'none';
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
    // Validar o índice antes de prosseguir
    if (!validateProductIndex(index)) {
        showError('Índice de produto inválido. Recarregue a página e tente novamente.');
        return;
    }
    
    // Ajuste importante: garantir que o índice seja usado para obter os dados corretos
    const materializationId = productIds[index];
    
    // Encontrar o resultado de otimização correto com base no ID da materialização
    const result = optimizationResults.find(r => r && r.materializationId === materializationId);
    
    console.log('Abrindo modal de resultado para índice:', index);
    console.log('Materialização ID:', materializationId);
    console.log('Produto:', productNames[index]);
    console.log('Resultado encontrado:', result);
    
    if (!result) {
        console.error('Resultado de otimização não encontrado para índice ' + index);
        showError('Dados de otimização não disponíveis para este produto.');
        return;
    }
    
    // Definir explicitamente o nome do produto com base no índice atual da tabela
    // em vez de confiar no nome armazenado no resultado
    document.getElementById('optimizationModalProductName').textContent = productNames[index];
    
    // Restante do código permanece o mesmo...
    
    // Formatar valores numéricos com verificação de existência
    const formatNumber = (value, decimals = 2) => {
        if (value === undefined || value === null) return 'N/A';
        return typeof value === 'number' ? value.toFixed(decimals) : value;
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

// Substitua as funções existentes para usar o sistema de notificações

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
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
    const oldDemandVector = [...demandVector]; // Para depuração
    demandVector = [];
    
    // Ler os valores atualizados da interface
    rows.forEach((row, index) => {
        const inputElement = row.querySelector('input');
        if (inputElement) {
            // Converter para número, garantindo que seja um valor válido
            const value = parseFloat(inputElement.value) || 0;
            demandVector.push(value);
            
            // Verificar se o ID de materialização correspondente existe
            if (index >= productIds.length) {
                console.warn(`Aviso: Índice ${index} não tem ID de materialização correspondente!`);
            }
        }
    });
    
    console.log("Vetor de demanda atualizado da UI:");
    console.log("- Antes:", oldDemandVector);
    console.log("- Depois:", demandVector);
    console.log("- IDs correspondentes:", productIds);
    
    // Garantir que o comprimento do vetor de demanda corresponda ao dos IDs de materialização
    if (demandVector.length !== productIds.length) {
        console.warn(`Aviso: Comprimento do vetor de demanda (${demandVector.length}) não corresponde ao dos IDs (${productIds.length})`);
        
        // Ajustar para garantir consistência
        while (demandVector.length > productIds.length) {
            demandVector.pop();
        }
        
        while (demandVector.length < productIds.length) {
            demandVector.push(0);
        }
        
        console.log("- Depois do ajuste:", demandVector);
    }
    
    return demandVector;
}

// Função corrigida para renderizar o vetor de produção
function renderProductionVector(productionVector) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        console.error("Container de resultados não encontrado");
        return;
    }
    
    // 1. Limpar o container de resultados
    resultsContainer.innerHTML = '';
    
    // 2. Criar elementos HTML para a tabela de produção
    const header = document.createElement('h2');
    header.textContent = 'Resultados da Planificação';
    resultsContainer.appendChild(header);
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 3. Criar cabeçalho da tabela
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Produto</th>
            <th>Produção Necessária</th>
            <th>Ações</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 4. Criar corpo da tabela
    const tbody = document.createElement('tbody');
    tbody.id = 'productionResults';
    
    // Função para formatar números
    const formatNumber = (value) => {
        if (value === undefined || value === null) return 'N/A';
        return typeof value === 'number' ? value.toFixed(2) : value;
    };
    
    // Adicionar linhas para cada produto - IMPORTANTE: Com botão "Detalhes" em vez de "Configurar Otimização"
    productionVector.forEach((production, index) => {
        if (index < productNames.length) {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${productNames[index]}</td>
                <td>${formatNumber(production)}</td>
                <td>
                    <button class="btn details-btn" onclick="openOptimizationResultModal(${index})">
                        Detalhes
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        }
    });
    
    table.appendChild(tbody);
    resultsContainer.appendChild(table);
    
    // 5. Garantir que o container de resultados esteja visível
    resultsContainer.style.display = 'block';
}

// Function to validate product indices
function validateProductIndex(index) {
    if (index === undefined || index === null || isNaN(index) || 
        index < 0 || index >= productIds.length) {
        console.error(`Índice de produto inválido: ${index}`);
        console.log("productIds.length =", productIds.length);
        console.log("productIds =", productIds);
        return false;
    }
    return true;
}

// Function to render the technological matrix
function renderTechnologicalMatrix() {
    if (!technologicalMatrix || !productNames) return;
    
    const technologicalMatrixTable = document.getElementById('technologicalMatrix');
    if (!technologicalMatrixTable) {
        console.error("Tabela de matriz tecnológica não encontrada");
        return;
    }
    
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

// Function to render optimization results - moved to global scope
function renderOptimizationResults(optimizationResults) {
    // This is a simplified version - just logging the results
    console.log("Optimization results:", optimizationResults);
    
    // In a complete implementation, you would:
    // 1. Find or create a container for the optimization results
    // 2. Render a table or cards showing the optimization details
    // 3. Add visualizations like charts if needed
    
    // Since we're now using the more complete renderProductionVector function,
    // which already includes the optimization results, this function can be minimal
}

// Function to render demand vector - moved to global scope
function renderDemandVector() {
    if (!demandVector || !productNames) return;
    
    const demandVectorTable = document.getElementById('demandVector');
    if (!demandVectorTable) {
        console.error("Table element for demand vector not found");
        return;
    }
    
    // Limpar tabela
    const tbody = demandVectorTable.querySelector('tbody');
    if (!tbody) {
        console.error("Tbody element not found in demand vector table");
        return;
    }
    tbody.innerHTML = '';
    
    // Modificar cabeçalhos para incluir a coluna de ação
    const thead = demandVectorTable.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th>Materialização Social</th>
            <th>Demanda Final</th>
            <th>Ação</th>
        `;
    }
    
    // Logging para depuração
    console.log("productNames:", productNames);
    console.log("productIds:", productIds);
    console.log("demandVector:", demandVector);
    
    // Adicionar linhas com valores
    demandVector.forEach((value, index) => {
        const row = document.createElement('tr');
        // Add data attribute for the materialization ID
        row.dataset.materializationId = productIds[index];
        
        const hasConfig = optimizationConfigs[index] !== undefined;
        const displayName = productNames[index] || `Materialização #${productIds[index] || index+1}`;
        
        row.innerHTML = `
            <td>${displayName}</td>
            <td>
                <input type="number" step="0.01" min="0" value="${value}" 
                      onchange="updateDemandVector(${index}, this.value)" />
            </td>
            <td class="action-buttons">
                <button class="btn btn-sm ${hasConfig ? 'btn-success' : ''}" onclick="openOptimizationConfigModal(${index})">
                    <i class="fas fa-cogs"></i>
                </button>
                <button class="btn btn-sm remove-btn" onclick="removeMaterialization(${productIds[index]})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
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
    
    // Botão para calcular estimativas
    const btnCalculateEstimates = document.getElementById('btnCalculateEstimates');
    if (btnCalculateEstimates) {
        btnCalculateEstimates.addEventListener('click', calculateEstimates);
    }

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
        
        // IMPORTANTE: Em vez de chamar loadTechnologicalMatrix e loadDemandVector,
        // chamar a função loadInstanceData que executa a planificação automática
        loadInstanceData(instanceId);
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
                
                // Renderizar a matriz na tabela - now uses global function
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
                console.log("Raw demand vector data:", data); // Debug the raw data
                
                // Ensure vector data exists
                if (!data.vector || !Array.isArray(data.vector)) {
                    console.error("Vector data is missing or not an array");
                    demandVector = [];
                    return;
                }
                
                // Ensure productNames and productIds arrays exist
                if (!data.productNames || !Array.isArray(data.productNames)) {
                    console.error("Product names data is missing or not an array");
                    productNames = [];
                } else {
                    productNames = data.productNames;
                }
                
                if (!data.productIds || !Array.isArray(data.productIds)) {
                    console.error("Product IDs data is missing or not an array");
                    productIds = [];
                } else {
                    productIds = data.productIds;
                }
                
                // Clear existing demand vector
                demandVector = [];
                
                // Process each value carefully
                data.vector.forEach((val, index) => {
                    let numValue = 0;
                    
                    try {
                        if (typeof val === 'number') {
                            numValue = val;
                        } else if (typeof val === 'string') {
                            numValue = parseFloat(val);
                        } else if (val && typeof val === 'object') {
                            // Handle BigDecimal JSON structure
                            if (val.scale !== undefined && val.value !== undefined) {
                                // This is likely a Jackson serialized BigDecimal
                                numValue = parseFloat(val.value) / Math.pow(10, val.scale);
                            } else {
                                // Try to convert using toString()
                                numValue = parseFloat(val.toString());
                            }
                        }
                    } catch (e) {
                        console.warn(`Error converting demand value at index ${index}:`, e);
                    }
                    
                    // Ensure we have a valid number (default to 0 if NaN)
                    numValue = isNaN(numValue) ? 0 : numValue;
                    demandVector.push(numValue);
                });
                
                console.log("Processed demand vector:", demandVector);
                console.log("Product names:", productNames);
                console.log("Product IDs:", productIds);
                
                // Renderizar o vetor na tabela
                renderDemandVector();
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
    function performPlanification() {
        const planifyButton = document.getElementById('planifyButton');
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        console.log("Iniciando planificação...");
        
        // Desabilitar o botão e mostrar spinner
        planifyButton.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        
        try {
            // Atualizar dados a partir da interface
            updateMatrixAndVectorData();
            
            // Verificar se há dados para planificar
            if (!productIds || productIds.length === 0) {
                console.error("IDs de materialização inválidos ou vazios:", productIds);
                showError("Não há materializações válidas para planificar. Adicione pelo menos uma materialização.");
                planifyButton.disabled = false;
                loadingSpinner.style.display = 'none';
                return;
            }
            
            console.log("Dados para planificação:");
            console.log("Matriz tecnológica:", technologicalMatrix);
            console.log("Vetor de demanda:", demandVector);
            console.log("Produtos:", productNames);
            console.log("IDs dos produtos:", productIds);
            
            // Verificar e ajustar dimensões da matriz e vetor
            ensureMatrixDimensions();
            
            // Preparar o objeto com os dados da planificação
            const planificationRequest = {
                instanceId: currentInstanceId,
                technologicalMatrix: technologicalMatrix,
                demandVector: demandVector,
                productNames: productNames,
                materializationIds: productIds
            };
            
            console.log("Enviando requisição de planificação:", planificationRequest);
            
            // Enviar a requisição para o servidor
            fetch('/api/planification/planify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planificationRequest)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Erro ao executar a planificação');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Resposta da planificação:", data);
                
                // Exibir resultados
                const results = document.getElementById('results');
                results.style.display = 'block';
                
                // Renderizar o vetor de produção
                renderProductionVector(data.productionVector);
                
                // Renderizar resultados de otimização
                if (data.optimizationResults) {
                    optimizationResults = data.optimizationResults;
                    renderOptimizationResults(data.optimizationResults);
                }
                
                // Rolar para os resultados
                results.scrollIntoView({ behavior: 'smooth' });
                
                showSuccess("Planificação concluída com sucesso!");
            })
            .catch(error => {
                console.error("Erro durante a planificação:", error);
                showError("Erro durante a planificação: " + error.message);
            })
            .finally(() => {
                // Habilitar o botão e esconder spinner
                planifyButton.disabled = false;
                loadingSpinner.style.display = 'none';
            });
        } catch (error) {
            console.error("Erro ao preparar dados para planificação:", error);
            showError("Erro ao preparar dados: " + error.message);
            planifyButton.disabled = false;
            loadingSpinner.style.display = 'none';
        }
    }
    
    /**
     * Renderiza os resultados da planificação
     */
    function renderResults(data) {
        console.log("Renderizando resultados da planificação:", data);
        
        if (!data || !data.productionVector || data.productionVector.length === 0) {
            showError("Não há resultados de planificação para exibir");
            return;
        }
        
        // Exibir resultados
        const results = document.getElementById('results');
        if (!results) {
            console.error("Elemento de resultados não encontrado");
            return;
        }
        
        results.style.display = 'block';
        
        // Armazenar resultados globalmente para uso nas modais
        optimizationResults = data.optimizationResults;
        
        // Renderizar o vetor de produção na tabela principal
        const productionResultsBody = document.getElementById('productionResults');
        if (!productionResultsBody) {
            console.error("Tabela de resultados de produção não encontrada");
            return;
        }
        
        // Limpar conteúdo anterior
        productionResultsBody.innerHTML = '';
        
        // Função para formatar números
        const formatNumber = (value) => {
            if (value === undefined || value === null) return 'N/A';
            return typeof value === 'number' ? value.toFixed(2) : value;
        };
        
        // Adicionar linhas à tabela de produção - AGORA COM BOTÃO DE DETALHES
        data.productionVector.forEach((production, index) => {
            // Verificar se temos o nome e ID correspondentes
            if (index < productNames.length) {
                const row = document.createElement('tr');
                
                // Obter o ID da materialização correspondente a este índice
                const materializationId = productIds[index];
                
                // Encontrar os dados de otimização correspondentes
                const optimizationData = optimizationResults ? 
                    optimizationResults.find(r => r.materializationId === materializationId) : null;
                
                row.innerHTML = `
                    <td>${productNames[index]}</td>
                    <td>${formatNumber(production)}</td>
                    <td>
                        <button class="btn details-btn" onclick="openOptimizationResultModal(${index})">
                            Detalhes
                        </button>
                    </td>
                `;
                
                productionResultsBody.appendChild(row);
            } else {
                console.warn("Índice fora dos limites para vetor de produção:", index);
            }
        });
        
        // Rolar para os resultados
        results.scrollIntoView({ behavior: 'smooth' });
        
        // Atualizar as linhas do vetor de demanda para adicionar o botão de configuração
        updateDemandVectorWithConfigButton();
        
        // Não chamar mais a função de renderização de resultados de otimização
        // renderOptimizationResults(optimizationResults);
        
        // Esconder a seção de resultados de otimização
        const optimizationResultsContainer = document.getElementById('optimizationResultsContainer');
        if (optimizationResultsContainer) {
            optimizationResultsContainer.style.display = 'none';
        }
    }
    
    /**
     * Salva as alterações na matriz e no vetor de demanda
     */
    function saveChanges() {
        if (!currentInstanceId) {
            showError("Selecione uma instância primeiro");
            return;
        }
        
        // Mostrar spinner de carregamento
        document.getElementById('loadingSpinner').style.display = 'inline-block';
        
        try {
            // 1. Atualizar variáveis com os dados atuais da interface
            updateMatrixAndVectorData();
            
            // 2. Prepare all promises that will be executed
            const allPromises = [];
            
            // Debug log para ajudar a identificar problemas
            console.log("Estado atual antes de salvar:");
            console.log("- productIds:", productIds);
            console.log("- demandVector:", demandVector);
            console.log("- Removidos:", window.removedMaterializationIds || []);
            
            // 3. Create deletion promises for the tracked removed materializations
            if (window.removedMaterializationIds && window.removedMaterializationIds.length > 0) {
                console.log("Excluindo materializações removidas:", window.removedMaterializationIds);
                
                window.removedMaterializationIds.forEach(materializationId => {
                    // Directly delete other related data first to ensure proper cleanup
                    const deleteOptimizationPromise = fetch(`/api/planification/optimization/${materializationId}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    });
                    allPromises.push(deleteOptimizationPromise);
                    
                    const deleteTensorPromise = fetch(`/api/planification/technological-tensor/by-materialization/${materializationId}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    });
                    allPromises.push(deleteTensorPromise);
                    
                    // Now delete the demand vector which triggers cascading deletion
                    const deleteDemandPromise = fetch(`/api/planification/demand-vector/${materializationId}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    }).then(response => {
                        console.log(`Status da exclusão do vetor de demanda para materialização ${materializationId}:`, response.status);
                        
                        // Mesmo se não encontrar (404), consideramos como "processado" para limpar a lista
                        if (!response.ok && response.status !== 404) {
                            return response.text().then(text => {
                                console.error(`Erro ao excluir vetor de demanda para materialização ${materializationId}:`, text);
                                throw new Error(`Falha ao excluir vetor de demanda: ${text}`);
                            });
                        }
                        
                        console.log(`Vetor de demanda para materialização ${materializationId} processado com sucesso`);
                        return response;
                    });
                    allPromises.push(deleteDemandPromise);
                });
            }
            
            // 4. Create promises to save/update each entry in the technological matrix
            for (let i = 0; i < technologicalMatrix.length; i++) {
                const rowId = productIds[i];
                
                for (let j = 0; j < technologicalMatrix[i].length; j++) {
                    const colId = productIds[j];
                    const value = technologicalMatrix[i][j];
                    
                    allPromises.push(
                        fetch('/api/planification/technological-tensor', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                inputMaterializationId: rowId,
                                outputMaterializationId: colId,
                                instanceId: currentInstanceId,
                                quantity: value
                            })
                        })
                    );
                }
            }
            
            // 5. Create promises to save/update each entry in the demand vector
            for (let i = 0; i < demandVector.length; i++) {
                const materializationId = productIds[i];
                const value = demandVector[i];
                
                // Verificar se o ID de materialização e o valor são válidos
                if (!materializationId || isNaN(materializationId) || materializationId <= 0) {
                    console.error(`ID de materialização inválido no índice ${i}:`, materializationId);
                    continue;
                }
                
                console.log(`Salvando demanda para materialização ${materializationId}: ${value}`);
                
                // Criar um payload explícito para depuração mais clara
                const demandPayload = {
                    materializationId: materializationId,
                    instanceId: currentInstanceId,
                    demand: value  // Importante: use "demand" em vez de "quantity" no payload
                };
                
                console.log(`Payload da demanda:`, demandPayload);
                
                const demandPromise = fetch('/api/planification/demand-vector', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(demandPayload)
                }).then(response => {
                    if (!response.ok) {
                        console.error(`Erro ao salvar vetor de demanda para materialização ${materializationId}:`, response.statusText);
                        // Tenta ler detalhes do erro do corpo da resposta
                        return response.text().then(text => {
                            console.error("Detalhes do erro:", text);
                            return response;
                        });
                    }
                    console.log(`Vetor de demanda para materialização ${materializationId} salvo com sucesso`);
                    return response;
                }).catch(error => {
                    console.error(`Erro na requisição para salvar demanda:`, error);
                    throw error;
                });
                
                allPromises.push(demandPromise);
            }
            
            // 6. Execute all promises
            Promise.all(allPromises)
                .then(responses => {
                    // Check if all responses were successful
                    const hasErrors = responses.some(res => !res.ok);
                    
                    if (hasErrors) {
                        throw new Error("Alguns dados não puderam ser salvos");
                    }
                    
                    // Clear the removed materializations list after successful save
                    window.removedMaterializationIds = [];
                    
                    // Update the original IDs reference to match current state
                    window.originalMaterializationIds = [...productIds];
                    
                    showSuccess("Dados salvos com sucesso!");
                    
                    // Verificar o estado após salvar
                    setTimeout(logDemandVectorStatus, 500);
                })
                .catch(error => {
                    console.error("Erro ao salvar dados:", error);
                    showError("Erro ao salvar dados: " + error.message);
                })
                .finally(() => {
                    // Hide loading spinner
                    document.getElementById('loadingSpinner').style.display = 'none';
                });
        } catch (error) {
            console.error("Erro ao preparar dados para salvar:", error);
            showError("Erro ao preparar dados: " + error.message);
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    }

    // Function to ensure we have valid indices before accessing elements
    function validateProductIndex(index) {
        if (index === undefined || index === null || isNaN(index) || 
            index < 0 || index >= productIds.length) {
            console.error(`Índice de produto inválido: ${index}`);
            console.log("productIds.length =", productIds.length);
            console.log("productIds =", productIds);
            return false;
        }
        return true;
    }

    /**
     * Carrega todos os dados da instância selecionada
     */
    function loadInstanceData(instanceId) {
        currentInstanceId = instanceId;
        
        // Mostrar spinner de carregamento
        document.getElementById('loadingSpinner').style.display = 'inline-block';
        
        // Limpar resultados anteriores
        document.getElementById('results').style.display = 'none';
        
        // Limpar configurações de otimização existentes
        Object.keys(optimizationConfigs).forEach(key => delete optimizationConfigs[key]);
        
        // Carregar matriz tecnológica e vetor de demanda em paralelo
        Promise.all([
            loadTechnologicalMatrix(instanceId),
            loadDemandVector(instanceId)
        ])
        .then(() => {
            // Carregar configurações de otimização existentes
            return loadOptimizationConfigs();
        })
        .then(() => {
            // Tentar carregar resultados anteriores, se existirem
            return loadPreviousResults(instanceId);
        })
        .catch(error => {
            console.error('Erro ao carregar dados da instância:', error);
            showError(`Erro ao carregar dados: ${error.message}`);
        })
        .finally(() => {
            // Mostrar a seção da matriz
            document.getElementById('matrixSection').style.display = 'block';
            document.getElementById('loadingSpinner').style.display = 'none';
            
            // Garantir que o botão de adicionar materialização esteja inicializado
            initAddMaterializationButton();
        });
    }
});

/**
 * Função para calcular estimativas com base nas instâncias filhas
 */
function calculateEstimates() {
    // Verificar se uma instância está selecionada
    const instanceId = document.getElementById('instanceSelect').value;
    if (!instanceId) {
        showNotification('Selecione uma instância primeiro!', 'error');
        return;
    }
    
    // Pedir confirmação ao usuário
    if (!confirm('Esta operação irá atualizar os valores da matriz tecnológica e do vetor de demanda com base nas instâncias filhas. Deseja continuar?')) {
        return;
    }
    
    // Mostrar status de processamento
    const statusElement = document.getElementById('calculationStatus');
    statusElement.style.display = 'inline-block';
    
    // Mostrar notificação de processamento
    const processingNotification = showNotification('Processando cálculo de estimativas...', 'info');
    
    // Chamar a API para calcular as estimativas
    fetch(`/api/council/${instanceId}/calculate-estimates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return handleHttpError(response);
        }
        return response.json();
    })
    .then(data => {
        // Processar a resposta e atualizar as tabelas
        updateTechnologicalMatrix(data.technologicalMatrix);
        updateDemandVector(data.demandVector);
        
        // Remover notificação de processamento
        processingNotification.remove();
        
        // Mostrar mensagem de sucesso
        showNotification('Estimativas calculadas com sucesso!', 'success');
        
        // Marcar que há alterações pendentes para salvar
        pageState.isDirty = true;
    })
    .catch(error => {
        console.error('Erro:', error);
        
        // Remover notificação de processamento
        processingNotification.remove();
        
        // Se o erro já foi tratado por handleHttpError, não mostrar notificação duplicada
        if (!error.status) {
            showNotification(`Erro ao calcular estimativas: ${error.message}`, 'error');
        }
    })
    .finally(() => {
        // Esconder status de processamento
        statusElement.style.display = 'none';
    });
}

// Function to update matrix and vector data from UI
function updateMatrixAndVectorData() {
    // Update matrix values from UI
    const matrixTable = document.getElementById('technologicalMatrix');
    const matrixInputs = matrixTable.querySelectorAll('input');
    
    matrixInputs.forEach(input => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        if (!isNaN(row) && !isNaN(col)) {
            technologicalMatrix[row][col] = parseFloat(input.value) || 0;
        }
    });
    
    // Update demand vector from UI
    updateDemandVectorFromUI();
}

// Function to remove a materialization from the tables
function removeMaterialization(materializationId) {
    // Confirmar antes de remover
    if (!confirm('Tem certeza que deseja remover esta materialização? Isso também removerá a linha e coluna correspondente na matriz tecnológica.')) {
        return;
    }
    
    console.log(`Removendo materialização com ID: ${materializationId}`);
    
    // Track removed materials globally if the tracking array doesn't exist yet
    if (!window.removedMaterializationIds) {
        window.removedMaterializationIds = [];
    }
    
    // Add this ID to our tracking array of removed materializations
    if (!window.removedMaterializationIds.includes(materializationId)) {
        window.removedMaterializationIds.push(materializationId);
    }
    
    // Find the index of this materialization in our global arrays
    const matIndex = productIds.indexOf(materializationId);
    if (matIndex === -1) {
        console.error(`Materialização com ID ${materializationId} não encontrada nos arrays globais`);
        return;
    }
    
    // Registrar estado antes da remoção para depuração
    console.log("Estado antes da remoção:");
    console.log("- productIds:", [...productIds]);
    console.log("- demandVector:", [...demandVector]);
    console.log("- Índice a remover:", matIndex);
    
    // Update global arrays before updating the UI
    // Remove the materialization from productIds and productNames
    productIds.splice(matIndex, 1);
    productNames.splice(matIndex, 1);
    
    // Remove the row and column from the technologicalMatrix
    technologicalMatrix.splice(matIndex, 1); // Remove row
    for (let i = 0; i < technologicalMatrix.length; i++) {
        if (technologicalMatrix[i]) {
            technologicalMatrix[i].splice(matIndex, 1); // Remove column from each remaining row
        }
    }
    
    // Remove from the demandVector
    demandVector.splice(matIndex, 1);
    
    // Re-render both tables completely
    renderTechnologicalMatrix();
    renderDemandVector();
    
    // Also update optimizationConfigs to prevent accessing invalid indices
    const newOptimizationConfigs = {};
    Object.keys(optimizationConfigs).forEach(key => {
        const numIndex = parseInt(key);
        if (numIndex < matIndex) {
            // Indices before the removed one stay the same
            newOptimizationConfigs[numIndex] = optimizationConfigs[numIndex];
        } else if (numIndex > matIndex) {
            // Indices after the removed one are decremented
            newOptimizationConfigs[numIndex - 1] = optimizationConfigs[numIndex];
        }
        // The removed index itself is skipped
    });
    
    // Replace the old configs with the updated ones
    Object.assign(optimizationConfigs, newOptimizationConfigs);
    
    // Registrar estado após a remoção para depuração
    console.log("Estado após a remoção:");
    console.log("- productIds:", productIds);
    console.log("- demandVector:", demandVector);
    console.log("- A remover:", window.removedMaterializationIds);
    
    // Show success message
    showSuccess('Materialização removida. Clique em "Salvar Alterações" para confirmar a exclusão no banco de dados.');
}

// Function to show the modal for creating a new materialization
function showNewMaterializationModal() {
    // Close the materialization dropdown if it's open
    const dropdown = document.querySelector('.materialization-dropdown');
    if (dropdown) dropdown.remove();
    
    // Get modal element
    const modal = document.getElementById('newMaterializationModal');
    if (!modal) {
        console.error("Modal for new materialization not found");
        showError("Erro: Modal para nova materialização não encontrada");
        return;
    }
    
    // Clear previous content
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>Criar Nova Materialização Social</h3>
            <span class="close" onclick="closeNewMaterializationModal()">&times;</span>
        </div>
        <div class="modal-body">
            <form id="newMaterializationForm">
                <div class="form-group">
                    <label for="newMaterializationName">Nome:</label>
                    <input type="text" id="newMaterializationName" required>
                </div>
                <div class="form-group">
                    <label for="newMaterializationType">Tipo:</label>
                    <select id="newMaterializationType" required>
                        <option value="">Selecione um tipo</option>
                        <option value="SERVICE">Serviço</option>
                        <option value="GOOD">Bem</option>
                        <option value="INFRASTRUCTURE">Infraestrutura</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="newMaterializationSector">Setor:</label>
                    <select id="newMaterializationSector" required>
                        <option value="">Carregando setores...</option>
                    </select>
                </div>
                <div id="newMaterializationError" class="error-message" style="display: none;"></div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeNewMaterializationModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="saveNewMaterialization()">Salvar</button>
            <div id="newMaterializationSpinner" class="loading" style="display: none;"></div>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    
    // Load sectors for dropdown
    loadSectorsForDropdown();
}

// Function to close the new materialization modal
function closeNewMaterializationModal() {
    const modal = document.getElementById('newMaterializationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to load sectors for dropdown
function loadSectorsForDropdown() {
    const sectorSelect = document.getElementById('newMaterializationSector');
    if (!sectorSelect) return;
    
    fetch('/api/sectors')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar setores');
            }
            return response.json();
        })
        .then(sectors => {
            // Clear loading option
            sectorSelect.innerHTML = '<option value="">Selecione um setor</option>';
            
            // Add sectors to dropdown
            sectors.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.id;
                option.textContent = sector.name;
                sectorSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar setores:', error);
            sectorSelect.innerHTML = '<option value="">Erro ao carregar setores</option>';
        });
}

// Function to save new materialization
function saveNewMaterialization() {
    // Get form values
    const name = document.getElementById('newMaterializationName').value.trim();
    const type = document.getElementById('newMaterializationType').value;
    const sectorId = document.getElementById('newMaterializationSector').value;
    
    // Validate form
    if (!name || !type || !sectorId) {
        const errorElement = document.getElementById('newMaterializationError');
        errorElement.textContent = 'Todos os campos são obrigatórios';
        errorElement.style.display = 'block';
        return;
    }
    
    // Show spinner
    const spinner = document.getElementById('newMaterializationSpinner');
    spinner.style.display = 'inline-block';
    
    // Prepare data
    const data = {
        name: name,
        type: type,
        sectorId: parseInt(sectorId)
    };
    
    // Send request
    fetch('/api/social-materializations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Erro ao criar materialização');
            });
        }
        return response.json();
    })
    .then(result => {
        // Close modal
        closeNewMaterializationModal();
        
        // Show success message
        showSuccess(`Materialização "${result.name}" criada com sucesso`);
        
        // Add to table if we're in a planification context
        if (currentInstanceId) {
            addMaterializationToTable(result, currentInstanceId);
        }
    })
    .catch(error => {
        console.error('Erro ao criar materialização:', error);
        const errorElement = document.getElementById('newMaterializationError');
        errorElement.textContent = error.message || 'Erro ao criar materialização';
        errorElement.style.display = 'block';
    })
    .finally(() => {
        // Hide spinner
        spinner.style.display = 'none';
    });
}

// Adicione esta função de log para ajudar no diagnóstico
function logDemandVectorStatus() {
    if (!currentInstanceId) return;
    
    fetch(`/api/planification/instances/${currentInstanceId}/demand-vector`)
        .then(response => response.json())
        .then(data => {
            console.log("Estado atual do vetor de demanda no servidor:", data);
        })
        .catch(err => console.error("Erro ao verificar vetor de demanda:", err));
}