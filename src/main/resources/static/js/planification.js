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
    if (productIndex === undefined || productIndex < 0 || productIndex >= productIds.length) {
        console.error(`Índice de produto inválido: ${productIndex}`);
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
            
            // 2. Obter os IDs das materializações atualmente na tabela
            const currentMaterializationIds = Array.from(
                document.querySelectorAll('#demandVector tbody tr')
            ).map(row => {
                const idStr = row.dataset.materializationId;
                return idStr ? parseInt(idStr) : null;
            }).filter(id => id && !isNaN(id));
            
            console.log("IDs atuais na tabela:", currentMaterializationIds);
            
            // 3. Determinar quais materializações foram excluídas 
            // Comparando IDs originais com os atuais na tabela
            const removedIds = [];
            if (window.originalMaterializationIds) {
                removedIds.push(...window.originalMaterializationIds.filter(
                    id => !currentMaterializationIds.includes(id)
                ));
            }
            
            console.log("IDs removidos:", removedIds);
            
            // 4. Criar promessas para salvar/atualizar cada entrada da matriz
            const matrixPromises = [];
            
            for (let i = 0; i < technologicalMatrix.length; i++) {
                const rowId = productIds[i];
                
                for (let j = 0; j < technologicalMatrix[i].length; j++) {
                    const colId = productIds[j];
                    const value = technologicalMatrix[i][j];
                    
                    matrixPromises.push(
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
            
            // 5. Criar promessas para salvar/atualizar cada entrada do vetor de demanda
            const vectorPromises = [];
            
            for (let i = 0; i < demandVector.length; i++) {
                const materializationId = productIds[i];
                const value = demandVector[i];
                
                vectorPromises.push(
                    fetch('/api/planification/demand-vector', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            materializationId: materializationId,
                            instanceId: currentInstanceId,
                            demand: value
                        })
                    })
                );
            }
            
            // 6. Criar promessas para excluir as materializações removidas
            const deletePromises = [];
            
            for (const id of removedIds) {
                // Excluir da matriz tecnológica (deleta linha e coluna)
                deletePromises.push(
                    fetch(`/api/planification/technological-tensor/by-materialization/${id}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    })
                );
                
                // Excluir do vetor de demanda
                deletePromises.push(
                    fetch(`/api/planification/demand-vector/${id}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    })
                );
            }
            
            // 7. Executar todas as promessas
            Promise.all([...matrixPromises, ...vectorPromises, ...deletePromises])
                .then(responses => {
                    // Verificar se todas as respostas foram bem-sucedidas
                    const hasErrors = responses.some(res => !res.ok);
                    
                    if (hasErrors) {
                        throw new Error("Alguns dados não puderam ser salvos");
                    }
                    
                    // Atualizar a lista de IDs originais
                    window.originalMaterializationIds = [...currentMaterializationIds];
                    
                    showSuccess("Dados salvos com sucesso!");
                })
                .catch(error => {
                    console.error("Erro ao salvar dados:", error);
                    showError("Erro ao salvar dados: " + error.message);
                })
                .finally(() => {
                    // Ocultar spinner de carregamento
                    document.getElementById('loadingSpinner').style.display = 'none';
                });
        } catch (error) {
            console.error("Erro ao preparar dados para salvar:", error);
            showError("Erro ao preparar dados: " + error.message);
            document.getElementById('loadingSpinner').style.display = 'none';
        }
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

    // Modificar a função loadInstanceData para carregar os resultados anteriores automaticamente
    function loadInstanceData(instanceId) {
        currentInstanceId = instanceId;
        
        // Mostrar spinner de carregamento
        document.getElementById('loadingSpinner').style.display = 'inline-block';
        
        // Limpar resultados anteriores
        document.getElementById('results').style.display = 'none';
        
        Promise.all([
            fetch(`/api/planification/instances/${instanceId}/technological-matrix`).then(res => res.json()),
            fetch(`/api/planification/instances/${instanceId}/demand-vector`).then(res => res.json())
        ])
        .then(([matrixData, vectorData]) => {
            // Preencher a matriz tecnológica
            const matrixTable = document.getElementById('technologicalMatrix');
            const matrixThead = matrixTable.querySelector('thead');
            const matrixTbody = matrixTable.querySelector('tbody');
            
            // Limpar conteúdo atual
            matrixThead.innerHTML = '';
            matrixTbody.innerHTML = '';
            
            // Criar cabeçalho
            const headerRow = document.createElement('tr');
            
            // Primeira célula vazia do cabeçalho
            const emptyHeader = document.createElement('th');
            headerRow.appendChild(emptyHeader);
            
            // Adicionar nomes dos produtos como cabeçalhos
            for (let i = 0; i < matrixData.productNames.length; i++) {
                const th = document.createElement('th');
                th.textContent = matrixData.productNames[i];
                th.dataset.materializationId = matrixData.productIds[i];
                headerRow.appendChild(th);
            }
            
            matrixThead.appendChild(headerRow);
            
            // Adicionar linhas com valores da matriz
            for (let i = 0; i < matrixData.matrix.length; i++) {
                const tr = document.createElement('tr');
                tr.dataset.materializationId = matrixData.productIds[i];
                
                // Primeira célula com nome do produto
                const nameCell = document.createElement('td');
                nameCell.className = 'product-name';
                nameCell.textContent = matrixData.productNames[i];
                tr.appendChild(nameCell);
                
                // Adicionar células com inputs para valores
                for (let j = 0; j < matrixData.matrix[i].length; j++) {
                    const td = document.createElement('td');
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = '0';
                    input.max = '1';
                    input.step = '0.01';
                    input.value = matrixData.matrix[i][j];
                    input.dataset.row = matrixData.productIds[i];
                    input.dataset.col = matrixData.productIds[j];
                    input.className = 'matrix-input';
                    
                    td.appendChild(input);
                    tr.appendChild(td);
                }
                
                matrixTbody.appendChild(tr);
            }
            
            // Preencher o vetor de demanda
            const demandTable = document.getElementById('demandVector');
            const demandTbody = demandTable.querySelector('tbody');
            demandTbody.innerHTML = '';
            
            for (let i = 0; i < vectorData.vector.length; i++) {
                const row = document.createElement('tr');
                row.dataset.materializationId = vectorData.productIds[i];
                
                // Armazenar o índice correto como atributo data para referência futura
                const actualIndex = i; // Captura o índice atual do loop
                
                row.innerHTML = `
                    <td>${vectorData.productNames[i]}</td>
                    <td>
                        <input type="number" min="0" step="0.01" value="${vectorData.vector[i]}" 
                               class="demand-input" data-id="${vectorData.productIds[i]}">
                    </td>
                    <td class="action-cell">
                        <div class="action-buttons">
                            <button class="action-btn config-btn" title="Configurar otimização" 
                                    data-product-index="${actualIndex}">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="action-btn remove-btn" title="Remover materialização" 
                                    data-id="${vectorData.productIds[i]}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                demandTbody.appendChild(row);
                
                // Adicionar evento ao botão de configuração diretamente após a linha ser adicionada
                const configBtn = row.querySelector('.config-btn');
                if (configBtn) {
                    configBtn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-product-index'));
                        console.log(`Abrindo config para produto índice ${index}, ID ${productIds[index]}`);
                        openOptimizationConfigModal(index);
                    });
                }
                
                // Adicionar evento ao botão de remoção
                const removeBtn = row.querySelector('.remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        removeMaterialization(vectorData.productIds[i]);
                    });
                }
            }
            
            // Atualizar variáveis globais
            productNames = vectorData.productNames;
            productIds = vectorData.productIds;
            technologicalMatrix = matrixData.matrix;
            demandVector = vectorData.vector;
            
            // NOVO: Salvar os IDs originais para referência
            window.originalMaterializationIds = [...vectorData.productIds];
            
            // Mostrar a seção da matriz
            document.getElementById('matrixSection').style.display = 'block';
            document.getElementById('loadingSpinner').style.display = 'none';
            
            // Adicionar botão de adição ao vetor de demanda se não existir
            addDemandVectorAddButton();
        })
        .catch(error => {
            console.error('Erro ao carregar dados da instância:', error);
            showError(`Erro ao carregar dados: ${error.message}`);
            document.getElementById('loadingSpinner').style.display = 'none';
        });
    }

    // Inicializar o botão de adicionar materialização
    initAddMaterializationButton();

    // Inicializar o formulário de nova materialização
    initNewMaterializationForm();
});

// Adicionar ao arquivo planification.js

// Declarar variáveis adicionais para controle do dropdown
let materializationDropdown = null;
let availableMaterializations = [];

// Função para inicializar os eventos do botão de adicionar materialização
function initAddMaterializationButton() {
    const addButton = document.getElementById('addMaterializationBtn');
    if (!addButton) return;
    
    addButton.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Se o dropdown já estiver aberto, feche-o
        if (materializationDropdown) {
            document.body.removeChild(materializationDropdown);
            materializationDropdown = null;
            return;
        }
        
        // Carregar as materializações disponíveis
        loadAvailableMaterializations()
            .then(materializations => {
                showMaterializationDropdown(materializations, e.target);
            })
            .catch(error => {
                console.error('Erro ao carregar materializações:', error);
                showError('Não foi possível carregar as materializações disponíveis.');
            });
    });
    
    // Fechar o dropdown ao clicar fora dele
    document.addEventListener('click', function() {
        if (materializationDropdown) {
            document.body.removeChild(materializationDropdown);
            materializationDropdown = null;
        }
    });
}

// Função simplificada para carregar materializações disponíveis
async function loadAvailableMaterializations() {
    try {
        // 1. Coletar nomes das materializações já presentes na tabela
        const existingNames = [];
        const rows = document.querySelectorAll('#demandVector tbody tr');
        
        // Extrair os nomes das células da primeira coluna de cada linha
        rows.forEach(row => {
            const nameCell = row.cells[0]; // A primeira célula contém o nome
            if (nameCell && nameCell.textContent) {
                existingNames.push(nameCell.textContent.trim());
            }
        });
        
        console.log('Nomes já existentes na tabela:', existingNames);
        
        // 2. Buscar todas as materializações do servidor
        const response = await fetch('/api/social-materializations');
        if (!response.ok) {
            throw new Error('Erro ao carregar materializações');
        }
        
        const allMaterializations = await response.json();
        console.log('Todas materializações do servidor:', allMaterializations);
        
        // 3. Filtrar com base no nome - abordagem mais simples e direta
        const availableMats = allMaterializations.filter(mat => 
            !existingNames.includes(mat.name)
        );
        
        console.log('Materializações filtradas para o dropdown (por nome):', availableMats);
        return availableMats;
        
    } catch (error) {
        console.error('Erro ao carregar materializações:', error);
        showError('Erro ao carregar materializações: ' + error.message);
        return [];
    }
}

// Função para exibir o dropdown de materializações
function showMaterializationDropdown(materializations, targetElement) {
    // Armazenar para uso posterior
    availableMaterializations = materializations;
    
    // Criar o elemento de dropdown
    materializationDropdown = document.createElement('div');
    materializationDropdown.className = 'materialization-dropdown';
    
    // Determinar a posição do dropdown
    const buttonRect = targetElement.getBoundingClientRect();
    materializationDropdown.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
    materializationDropdown.style.left = `${buttonRect.left + window.scrollX - 200 + buttonRect.width/2}px`;
    
    // Criar os itens do dropdown
    if (materializations.length === 0) {
        materializationDropdown.innerHTML = `
            <div class="empty-message">
                Não há materializações disponíveis para adicionar.
            </div>
        `;
    } else {
        let dropdownHTML = '';
        
        // Adicionar cada materialização como uma opção
        materializations.forEach(mat => {
            dropdownHTML += `
                <div class="dropdown-item" data-id="${mat.id}">
                    ${mat.name} (${mat.type === 'PRODUCT' ? 'Produto' : 'Serviço'})
                </div>
            `;
        });
        
        // Adicionar a opção "Incluir nova"
        dropdownHTML += `
            <div class="dropdown-item add-new-item" data-action="add-new">
                <i class="fas fa-plus-circle"></i> Incluir nova materialização
            </div>
        `;
        
        materializationDropdown.innerHTML = dropdownHTML;
        
        // Adicionar eventos de clique aos itens
        materializationDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (item.dataset.action === 'add-new') {
                    // Abrir modal para cadastrar nova materialização
                    openNewMaterializationModal();
                } else {
                    // Adicionar materialização existente
                    const materializationId = parseInt(item.dataset.id);
                    const materialization = availableMaterializations.find(m => m.id === materializationId);
                    
                    if (materialization) {
                        addMaterializationToDemandVector(materialization);
                    }
                }
                
                // Fechar o dropdown
                document.body.removeChild(materializationDropdown);
                materializationDropdown = null;
            });
        });
    }
    
    // Adicionar o dropdown ao corpo do documento
    document.body.appendChild(materializationDropdown);
    
    // Prevenir o comportamento padrão de fechar ao clicar no dropdown
    materializationDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Função para adicionar a materialização à tabela de demanda
function addMaterializationToDemandVector(materialization) {
    const demandTable = document.getElementById('demandVector');
    const tbody = demandTable.querySelector('tbody');
    
    // Verificar se já existe
    const existingRow = tbody.querySelector(`tr[data-materialization-id="${materialization.id}"]`);
    if (existingRow) {
        showError(`Materialização "${materialization.name}" já está na tabela de demanda`);
        return;
    }
    
    // Adicionar a materialização ao arrays globais
    productIds.push(materialization.id);
    productNames.push(materialization.name);
    demandVector.push(0);
    
    // Calcular o novo índice
    const newIndex = productIds.length - 1;
    
    // Criar nova linha
    const row = document.createElement('tr');
    row.dataset.materializationId = materialization.id;
    
    // Adicionar células
    row.innerHTML = `
        <td>${materialization.name}</td>
        <td>
            <input type="number" min="0" step="0.01" class="demand-input" value="0" 
                data-id="${materialization.id}" onchange="updateDemandVectorFromUI()">
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn config-btn" title="Configurar otimização" data-product-index="${newIndex}">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="action-btn remove-btn" title="Remover" data-id="${materialization.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    // Adicionar à tabela
    tbody.appendChild(row);
    
    // Adicionar eventos após a inserção
    const configBtn = row.querySelector('.config-btn');
    if (configBtn) {
        configBtn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-product-index'));
            openOptimizationConfigModal(index);
        });
    }
    
    const removeBtn = row.querySelector('.remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            removeMaterialization(materialization.id);
        });
    }
    
    // Atualizar dados do vetor
    updateVectorData();
}

// Função para adicionar materialização à matriz tecnológica
function addMaterializationToTechnologicalMatrix(materialization) {
    const matrixTable = document.getElementById('technologicalMatrix');
    const thead = matrixTable.querySelector('thead');
    const tbody = matrixTable.querySelector('tbody');
    
    // 1. Adicionar coluna ao cabeçalho
    const headerRow = thead.querySelector('tr');
    const newTh = document.createElement('th');
    newTh.textContent = materialization.name;
    newTh.dataset.materializationId = materialization.id;
    headerRow.appendChild(newTh);
    
    // 2. Adicionar linha à matriz
    const newRow = document.createElement('tr');
    newRow.dataset.materializationId = materialization.id;
    
    // Adiciona célula de produto
    const productCell = document.createElement('td');
    productCell.className = 'product-name';
    productCell.textContent = materialization.name;
    newRow.appendChild(productCell);
    
    // Adiciona células para cada coluna existente
    const columnsCount = headerRow.querySelectorAll('th').length - 1; // -1 porque a primeira coluna é rótulo de linha
    
    for (let i = 0; i < columnsCount; i++) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = '0';
        input.dataset.row = materialization.id;
        input.dataset.col = headerRow.querySelectorAll('th')[i+1].dataset.materializationId; // +1 para pular a primeira coluna
        input.className = 'matrix-input';
        
        cell.appendChild(input);
        newRow.appendChild(cell);
    }
    
    tbody.appendChild(newRow);
    
    // 3. Adicionar nova célula a cada linha existente
    tbody.querySelectorAll('tr:not(:last-child)').forEach(row => {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = '0';
        input.dataset.row = row.dataset.materializationId;
        input.dataset.col = materialization.id;
        input.className = 'matrix-input';
        
        cell.appendChild(input);
        row.appendChild(cell);
    });
    
    // Atualizar dados internos da matriz
    updateMatrixData();
}

// Função corrigida para remover uma materialização
function removeMaterialization(materializationId) {
    // Confirmar antes de remover
    if (!confirm('Tem certeza que deseja remover esta materialização? Isso também removerá a linha e coluna correspondente na matriz tecnológica.')) {
        return;
    }
    
    console.log(`Removendo materialização com ID: ${materializationId}`);
    
    // 1. Remover linha da tabela de demanda
    const demandTable = document.getElementById('demandVector');
    const demandRow = demandTable.querySelector(`tr[data-materialization-id="${materializationId}"]`);
    if (demandRow) {
        console.log('Removendo linha da tabela de demanda');
        demandRow.remove();
    } else {
        console.warn('Linha não encontrada na tabela de demanda');
    }
    
    // 2. Remover da matriz tecnológica - usando uma abordagem mais robusta
    const matrixTable = document.getElementById('technologicalMatrix');
    if (!matrixTable) {
        console.error('Tabela de matriz tecnológica não encontrada');
        return;
    }
    
    // 2.1. Precisamos encontrar o índice da coluna de forma mais robusta
    // Primeiro, obtenha todos os cabeçalhos da matriz
    const headerRow = matrixTable.querySelector('thead tr');
    if (!headerRow) {
        console.error('Linha de cabeçalho não encontrada na matriz tecnológica');
        return;
    }
    
    // Encontre o índice da coluna que corresponde à materialização a ser removida
    let colIndex = -1;
    const headers = headerRow.querySelectorAll('th');
    
    // Tentar encontrar por data-attribute
    for (let i = 0; i < headers.length; i++) {
        if (headers[i].dataset.materializationId == materializationId) {
            colIndex = i;
            break;
        }
    }
    
    // Se não encontrou por data-attribute, tente encontrar pelo texto do cabeçalho
    if (colIndex === -1) {
        const productName = demandRow ? demandRow.cells[0].textContent.trim() : null;
        if (productName) {
            for (let i = 0; i < headers.length; i++) {
                if (headers[i].textContent.trim() === productName) {
                    colIndex = i;
                    break;
                }
            }
        }
    }
    
    // 2.2. Se encontrou a coluna, remova-a de todas as linhas
    if (colIndex >= 0) {
        console.log(`Coluna encontrada na posição ${colIndex}, removendo de todas as linhas`);
        
        // Remover o cabeçalho da coluna primeiro
        headers[colIndex].remove();
        
        // Remover a célula correspondente de cada linha
        const rows = matrixTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.cells.length > colIndex) {
                row.cells[colIndex].remove();
            }
        });
    } else {
        console.warn(`Coluna não encontrada para a materialização ${materializationId}`);
    }
    
    // 2.3. Encontrar e remover a linha correspondente
    // Primeiro, tente pelo atributo data-materialization-id
    let rowToRemove = matrixTable.querySelector(`tbody tr[data-materialization-id="${materializationId}"]`);
    
    // Se não encontrou, procure pelo nome do produto na primeira célula
    if (!rowToRemove && demandRow) {
        const productName = demandRow.cells[0].textContent.trim();
        const rows = matrixTable.querySelectorAll('tbody tr');
        
        for (const row of rows) {
            const firstCell = row.cells[0];
            if (firstCell && firstCell.textContent.trim() === productName) {
                rowToRemove = row;
                break;
            }
        }
    }
    
    // Remover a linha encontrada
    if (rowToRemove) {
        console.log('Removendo linha da matriz tecnológica');
        rowToRemove.remove();
    } else {
        console.warn('Linha não encontrada na matriz tecnológica');
    }
    
    // 3. Atualizar dados internos
    updateMatrixAndVectorData();
    console.log('Atualização dos dados internos concluída');
}

// Função corrigida para atualizar os dados da matriz tecnológica
function updateMatrixData() {
    const matrixTable = document.getElementById('technologicalMatrix');
    const thead = matrixTable.querySelector('thead');
    const tbody = matrixTable.querySelector('tbody');
    
    // Obter IDs das materializações das colunas com filtragem de valores inválidos
    const headerRow = thead.querySelector('tr');
    const columnIds = Array.from(headerRow.querySelectorAll('th'))
        .slice(1) // Ignorar primeira coluna (rótulo)
        .map(th => {
            const idStr = th.dataset.materializationId;
            const id = idStr ? parseInt(idStr) : NaN;
            return id;
        })
        .filter(id => !isNaN(id) && id > 0); // Garantir IDs válidos
    
    // Obter IDs das materializações das linhas com filtragem de valores inválidos
    const rowIds = Array.from(tbody.querySelectorAll('tr'))
        .map(tr => {
            const idStr = tr.dataset.materializationId;
            const id = idStr ? parseInt(idStr) : NaN;
            return id;
        })
        .filter(id => !isNaN(id) && id > 0); // Garantir IDs válidos
    
    console.log("IDs válidos das linhas:", rowIds);
    console.log("IDs válidos das colunas:", columnIds);
    
    // Reconstruir a matriz tecnológica
    technologicalMatrix = [];
    productIds = [...rowIds]; // Copiar os IDs válidos para a variável global
    productNames = Array.from(tbody.querySelectorAll('tr'))
        .filter(row => {
            const idStr = row.dataset.materializationId;
            const id = idStr ? parseInt(idStr) : NaN;
            return !isNaN(id) && id > 0;
        })
        .map(row => {
            const nameCell = row.querySelector('.product-name');
            return nameCell ? nameCell.textContent.trim() : '';
        })
        .filter(name => name); // Filtrar nomes vazios
    
    console.log("Nomes dos produtos:", productNames);
    console.log("IDs dos produtos:", productIds);
    
    // Criar matriz zerada
    for (let i = 0; i < rowIds.length; i++) {
        technologicalMatrix[i] = [];
        for (let j = 0; j < columnIds.length; j++) {
            technologicalMatrix[i][j] = 0;
        }
    }
    
    // Preencher matriz com valores dos inputs
    const inputs = tbody.querySelectorAll('.matrix-input');
    inputs.forEach(input => {
        if (!input.dataset.row || !input.dataset.col) return;
        
        const rowId = parseInt(input.dataset.row);
        const colId = parseInt(input.dataset.col);
        
        if (isNaN(rowId) || isNaN(colId)) return;
        
        const rowIndex = rowIds.indexOf(rowId);
        const colIndex = columnIds.indexOf(colId);
        
        if (rowIndex >= 0 && colIndex >= 0) {
            const value = parseFloat(input.value) || 0;
            technologicalMatrix[rowIndex][colIndex] = value;
        }
    });
}

// Função para atualizar os dados do vetor de demanda
function updateVectorData() {
    const demandTable = document.getElementById('demandVector');
    const tbody = demandTable.querySelector('tbody');
    
    // Obter IDs das materializações
    const rowIds = Array.from(tbody.querySelectorAll('tr'))
        .map(tr => parseInt(tr.dataset.materializationId));
    
    // Reconstruir o vetor de demanda
    demandVector = [];
    
    // Criar vetor zerado
    for (let i = 0; i < rowIds.length; i++) {
        demandVector[i] = 0;
    }
    
    // Preencher vetor com valores dos inputs
    const inputs = tbody.querySelectorAll('.demand-input');
    inputs.forEach(input => {
        const id = parseInt(input.dataset.id);
        const index = rowIds.indexOf(id);
        
        if (index >= 0) {
            demandVector[index] = parseFloat(input.value) || 0;
        }
    });
}

// Função para abrir a modal de cadastro de nova materialização
function openNewMaterializationModal() {
    // Limpar campos do formulário
    document.getElementById('newMaterializationForm').reset();
    
    // Limpar mensagens de erro/sucesso anteriores
    document.getElementById('newMaterializationFormError').style.display = 'none';
    document.getElementById('newMaterializationFormSuccess').style.display = 'none';
    
    // Exibir a modal
    document.getElementById('newMaterializationModal').style.display = 'block';
}

// Função para fechar a modal
function closeNewMaterializationModal() {
    document.getElementById('newMaterializationModal').style.display = 'none';
}

// Inicializar o formulário de nova materialização
function initNewMaterializationForm() {
    const form = document.getElementById('newMaterializationForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Mostrar spinner
        document.getElementById('newMaterializationModalSpinner').style.display = 'inline-block';
        
        // Obter dados do formulário
        const formData = {
            name: document.getElementById('materialName').value.trim(),
            type: document.getElementById('materialType').value,
            description: document.getElementById('materialDescription').value.trim(),
            instanceId: currentInstanceId
        };
        
        // Validar
        if (!formData.name) {
            showNewMaterializationError('O nome é obrigatório.');
            return;
        }
        
        // Enviar para o servidor
        submitNewMaterialization(formData);
    });
}

// Função para enviar nova materialização para o servidor
async function submitNewMaterialization(formData) {
    try {
        // Adicionar o ID da instância ao formData
        formData.instanceId = currentInstanceId;
        
        const response = await fetch('/api/social-materializations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao cadastrar materialização.');
        }
        
        const result = await response.json();
        
        // Mostrar mensagem de sucesso
        showNewMaterializationSuccess('Materialização cadastrada com sucesso!');
        
        // Adicionar a nova materialização à tabela
        setTimeout(() => {
            closeNewMaterializationModal();
            addMaterializationToDemandVector(result);
        }, 1500);
    } catch (error) {
        showNewMaterializationError(error.message);
    } finally {
        document.getElementById('newMaterializationModalSpinner').style.display = 'none';
    }
}

// Funções para exibir mensagens no formulário
function showNewMaterializationError(message) {
    const errorElement = document.getElementById('newMaterializationFormError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('newMaterializationModalSpinner').style.display = 'none';
}

function showNewMaterializationSuccess(message) {
    const successElement = document.getElementById('newMaterializationFormSuccess');
    successElement.textContent = message;
    successElement.style.display = 'block';
    document.getElementById('newMaterializationModalSpinner').style.display = 'none';
}

// Função para verificar e garantir as dimensões corretas antes de planificar
function ensureMatrixDimensions() {
    console.log("Verificando dimensões da matriz e vetor antes de planificar...");
    
    // Verificar se existem dados
    if (!technologicalMatrix || !demandVector) {
        console.warn("Matriz ou vetor não definidos!");
        return;
    }
    
    // Verificar se a matriz é quadrada
    const matrixSize = technologicalMatrix.length;
    
    // Verificar se o vetor tem o mesmo tamanho
    if (demandVector.length !== matrixSize) {
        console.warn("Tamanho do vetor de demanda incompatível, ajustando...");
        console.warn(`Matriz: ${matrixSize}x${matrixSize}, Vetor: ${demandVector.length}`);
        
        // Ajustar o vetor de demanda
        if (demandVector.length < matrixSize) {
            // Adicionar zeros ao vetor
            while (demandVector.length < matrixSize) {
                demandVector.push(0);
            }
        } else if (demandVector.length > matrixSize) {
            // Cortar o vetor
            demandVector = demandVector.slice(0, matrixSize);
        }
    }
    
    // Verificar se cada linha da matriz tem o tamanho correto
    for (let i = 0; i < matrixSize; i++) {
        if (!technologicalMatrix[i] || technologicalMatrix[i].length !== matrixSize) {
            console.warn(`Linha ${i} da matriz com tamanho incorreto, ajustando...`);
            
            // Se a linha não existe, criar com zeros
            if (!technologicalMatrix[i]) {
                technologicalMatrix[i] = new Array(matrixSize).fill(0);
            } 
            // Se a linha é menor que o necessário, completar com zeros
            else if (technologicalMatrix[i].length < matrixSize) {
                while (technologicalMatrix[i].length < matrixSize) {
                    technologicalMatrix[i].push(0);
                }
            } 
            // Se a linha é maior que o necessário, cortar
            else if (technologicalMatrix[i].length > matrixSize) {
                technologicalMatrix[i] = technologicalMatrix[i].slice(0, matrixSize);
            }
        }
    }
    
    console.log("Após ajustes:");
    console.log("Matriz tecnológica:", technologicalMatrix);
    console.log("Vetor de demanda:", demandVector);
}

// Função para atualizar os dados da matriz e do vetor após modificações
function updateMatrixAndVectorData() {
    updateMatrixData();
    updateVectorData();
}

// Adicione esta função ao arquivo planification.js
function renderOptimizationResults(results) {
    // Verificar se há resultados para mostrar
    if (!results || results.length === 0) {
        // Se não houver resultados, esconder a seção
        const optimizationResultsContainer = document.getElementById('optimizationResultsContainer');
        if (optimizationResultsContainer) {
            optimizationResultsContainer.style.display = 'none';
        }
        return;
    }

    // Armazenar resultados globalmente para uso nas modais
    optimizationResults = results;

    // Obter referência à tabela
    const optimizationTable = document.getElementById('optimizationResults');
    if (!optimizationTable) {
        console.error('Tabela de resultados de otimização não encontrada');
        return;
    }

    // Mostrar seção
    const optimizationResultsContainer = document.getElementById('optimizationResultsContainer');
    if (optimizationResultsContainer) {
        optimizationResultsContainer.style.display = 'block';
    }

    // Limpar conteúdo existente
    const tbody = optimizationTable.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '';
    } else {
        console.error('Corpo da tabela de resultados de otimização não encontrado');
        return;
    }

    // Renderizar resultados - sem o botão de configuração!
    results.forEach(result => {
        if (!result) return;

        const row = document.createElement('tr');
        
        // Formatação de números para exibição
        const formatNumber = (value) => {
            if (value === undefined || value === null) return 'N/A';
            return typeof value === 'number' ? value.toFixed(2) : value;
        };

        // Colunas: Produto, Produção, Trabalhadores, Fábricas, Turnos, Horas, Ações
        row.innerHTML = `
            <td>${result.productName || 'Sem nome'}</td>
            <td>${formatNumber(result.productionNeeded)}</td>
            <td>${formatNumber(result.workersNeeded)}</td>
            <td>${formatNumber(result.factoriesNeeded)}</td>
            <td>${result.nightShift ? 'Diurno e Noturno' : 'Diurno'}</td>
            <td>${formatNumber(result.totalHours)}</td>
            <td>
                <button class="btn details-btn" onclick="openOptimizationResultModal(${productIds.indexOf(result.materializationId)})">
                    Detalhes
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Adicione esta função ao arquivo planification.js
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
    
    // Adicionar linhas à tabela de produção - COM BOTÃO DE DETALHES
    data.productionVector.forEach((production, index) => {
        // Verificar se temos o nome e ID correspondentes
        if (index < productNames.length) {
            const row = document.createElement('tr');
            
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
            console.warn(`Índice ${index} fora dos limites dos nomes de produtos disponíveis`);
        }
    });
    
    // Rolar para os resultados
    results.scrollIntoView({ behavior: 'smooth' });
    
    // Atualizar as linhas do vetor de demanda para adicionar o botão de configuração
    updateDemandVectorWithConfigButton();
}

// Adicione esta nova função para atualizar as linhas existentes no vetor de demanda
function updateDemandVectorWithConfigButton() {
    // Seleciona todas as linhas na tabela de demanda
    const demandRows = document.querySelectorAll('#demandVector tbody tr:not(.add-materialization-row)');
    
    demandRows.forEach((row, rowIndex) => {
        // Obter o ID da materialização usando o atributo data-materialization-id da linha
        const materializationId = parseInt(row.dataset.materializationId);
        if (!materializationId) {
            console.warn('Linha sem ID de materialização válido:', row);
            return; // Pular esta linha
        }
        
        // Verificar se já existe botão de configuração
        const existingConfigBtn = row.querySelector('.config-btn');
        if (existingConfigBtn) {
            // Atualizar o atributo data-product-index para garantir que esteja correto
            existingConfigBtn.setAttribute('data-product-index', rowIndex);
            
            // Atualizar o evento click também
            existingConfigBtn.onclick = function() {
                const index = parseInt(this.getAttribute('data-product-index'));
                console.log(`Abrindo config para produto índice ${index}, ID ${productIds[index] || 'indefinido'}`);
                if (index >= 0 && index < productIds.length) {
                    openOptimizationConfigModal(index);
                } else {
                    showError('Índice de produto inválido. Recarregue a página e tente novamente.');
                }
            };
            
            return; // Já existe um botão, apenas atualizamos o índice
        }
        
        // Verificar se já existe uma coluna de ações
        let actionsCell = row.querySelector('td:last-child');
        let actionButtonsDiv;
        
        if (!actionsCell || !actionsCell.classList.contains('action-cell')) {
            // Criar célula de ações se não existir
            actionsCell = document.createElement('td');
            actionsCell.className = 'action-cell';
            row.appendChild(actionsCell);
        }
        
        // Verificar se já existe div de botões
        actionButtonsDiv = actionsCell.querySelector('.action-buttons');
        if (!actionButtonsDiv) {
            actionButtonsDiv = document.createElement('div');
            actionButtonsDiv.className = 'action-buttons';
            actionsCell.appendChild(actionButtonsDiv);
        }
        
        // Criar o botão de configuração
        const configButton = document.createElement('button');
        configButton.className = 'action-btn config-btn';
        configButton.title = 'Configurar otimização';
        configButton.innerHTML = '<i class="fas fa-cog"></i>';
        configButton.setAttribute('data-product-index', rowIndex);
        
        // Definir o onclick usando o rowIndex diretamente
        configButton.onclick = function() {
            const index = parseInt(this.getAttribute('data-product-index'));
            console.log(`Abrindo config para produto índice ${index}, ID ${productIds[index] || 'indefinido'}`);
            if (index >= 0 && index < productIds.length) {
                openOptimizationConfigModal(index);
            } else {
                showError('Índice de produto inválido. Recarregue a página e tente novamente.');
            }
        };
        
        // Adicionar o botão na posição correta
        const removeBtn = actionButtonsDiv.querySelector('.remove-btn');
        if (removeBtn) {
            actionButtonsDiv.insertBefore(configButton, removeBtn);
        } else {
            actionButtonsDiv.appendChild(configButton);
            
            // Se não tinha botão de remover, adicionar um
            const removeButton = document.createElement('button');
            removeButton.className = 'action-btn remove-btn';
            removeButton.title = 'Remover';
            removeButton.innerHTML = '<i class="fas fa-trash"></i>';
            removeButton.onclick = function() { 
                removeMaterialization(materializationId); 
            };
            actionButtonsDiv.appendChild(removeButton);
        }
    });
}

// Adicione uma chamada a esta função no carregamento inicial da instância
document.addEventListener('DOMContentLoaded', function() {
    // Outras inicializações...
    
    // Adicionar esta linha para garantir que seja chamada quando a página carregar
    setTimeout(updateDemandVectorWithConfigButton, 1000);
});

// Função para adicionar o botão de adição ao vetor de demanda
function addDemandVectorAddButton() {
    // Verificar se já existe um botão com ID addMaterializationBtn em qualquer lugar
    if (document.getElementById('addMaterializationBtn')) {
        return; // Botão já existe, não adicione novamente
    }
    
    const vectorContainer = document.querySelector('.vector-container');
    
    // Verificar se já existe a div de ações
    if (!vectorContainer.querySelector('.vector-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'vector-actions';
        
        actionsDiv.innerHTML = `
            <button id="addMaterializationBtn" class="action-btn add-btn" title="Adicionar materialização">
                <i class="fas fa-plus"></i>
            </button>
        `;
        
        // Inserir antes da tabela
        const demandTable = document.getElementById('demandVector');
        vectorContainer.insertBefore(actionsDiv, demandTable);
        
        // Adicionar evento ao botão
        const addButton = document.getElementById('addMaterializationBtn');
        if (addButton) {
            // Código do evento
        }
    }
}