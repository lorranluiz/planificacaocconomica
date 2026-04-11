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
let originalMaterializationIds = []; // Track IDs that were loaded from the server
let newlyAddedMaterializationIds = []; // Track IDs that were added but not yet saved

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
        
        // Exibir a modal com display block em vez de flex para compatibilidade
        const modal = document.getElementById('optimizationConfigModal');
        modal.style.display = 'block';
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
            
            // Mostrar o modal com display block (não flex)
            const modal = document.getElementById('optimizationConfigModal');
            modal.style.display = 'block';
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
            
            // Mostrar o modal com display block (não flex)
            const modal = document.getElementById('optimizationConfigModal');
            modal.style.display = 'block';
        })
        .finally(() => {
            document.getElementById('optimizationModalSpinner').style.display = 'none';
        });
}

function closeOptimizationConfigModal() {
    const modal = document.getElementById('optimizationConfigModal');
    if (modal) {
        modal.style.display = 'none';
    }
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
    document.getElementById('optimizationModalProductName').textContent = productNames[index];
    
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
    
    // Exibir a modal com display block em vez de flex para consistência
    document.getElementById('optimizationResultModal').style.display = 'block';
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

// Função corrigida para renderizar o vetor de produção SEM os botões de otimização
function renderProductionVector(productionVector) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        console.error('Container de resultados não encontrado');
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
        if (value === null || value === undefined || isNaN(value)) return "0";
        return typeof value === 'number' 
            ? value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
            : value.toString().replace('.', ',');
    };
    
    // Adicionar linhas para cada produto - APENAS com botão "Detalhes"
    productionVector.forEach((production, index) => {
        if (index < productNames.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${productNames[index]}</td>
                <td>${formatNumber(production)}</td>
                <td class="action-buttons">
                    <button class="action-btn details-btn" title="Ver detalhes de otimização"
                        onclick="openOptimizationResultModal(${index})">
                        <i class="fas fa-chart-bar"></i>
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
    
    // 6. Armazenar os resultados para uso posterior na otimização
    storeOptimizationResults(productionVector);
}

// Function to render demand vector - moved to global scope
function renderDemandVector() {
    // Verificação detalhada dos dados para depuração
    if (!demandVector) {
        console.warn("Vetor de demanda não definido");
        return;
    }
    
    if (!productNames) {
        console.warn("Nomes de produtos não definidos");
        return;
    }
    
    if (demandVector.length !== productNames.length || demandVector.length !== productIds.length) {
        console.warn(`Inconsistência nas dimensões: demandVector(${demandVector.length}), productNames(${productNames.length}), productIds(${productIds.length})`);
        // Tentar corrigir as dimensões antes de continuar
        ensureMatrixDimensions();
    }
    
    const demandVectorTable = document.getElementById('demandVector');
    if (!demandVectorTable) {
        console.error("Tabela de vetor de demanda não encontrada no DOM");
        return;
    }
    
    // Limpar tabela
    const tbody = demandVectorTable.querySelector('tbody');
    if (!tbody) {
        console.error("Elemento tbody não encontrado na tabela de vetor de demanda");
        return;
    }
    tbody.innerHTML = '';
    
    // Modificar cabeçalhos para incluir a coluna de ação
    const thead = demandVectorTable.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th>Produto</th>
            <th>Demanda Final</th>
            <th>Ações</th>
        `;
    }
    
    // Log para depuração
    console.log("Renderizando vetor de demanda:");
    console.log("- productNames:", productNames);
    console.log("- productIds:", productIds);
    console.log("- demandVector:", demandVector);
    
    // Adicionar linhas com valores
    demandVector.forEach((value, index) => {
        if (index >= productNames.length || index >= productIds.length) {
            console.warn(`Índice fora dos limites: ${index}. Ignorando esta entrada.`);
            return;
        }
        
        const tr = document.createElement('tr');
        
        // Formatar o valor para exibição
        const formattedValue = value !== null && value !== undefined 
            ? value.toString().replace('.', ',') 
            : '0';
        
        // Célula com nome do produto
        const tdName = document.createElement('td');
        tdName.textContent = productNames[index] || `Produto #${index + 1}`;
        tr.appendChild(tdName);
        
        // Célula com valor da demanda (editável)
        const tdValue = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = formattedValue;
        input.className = 'form-control';
        input.dataset.index = index;
        input.onchange = function() {
            const value = this.value.replace(',', '.'); // Normalizar para cálculo
            updateDemandVectorElement(parseInt(this.dataset.index), value);
        };
        tdValue.appendChild(input);
        tr.appendChild(tdValue);
        
        // Célula com botões de ação - AGORA INCLUINDO BOTÃO DE CONFIGURAR OTIMIZAÇÃO
        const tdActions = document.createElement('td');
        tdActions.className = 'action-buttons';
        
        // Adicionar botão de Configurar Otimização
        const configBtn = document.createElement('button');
        configBtn.className = 'action-btn config-btn';
        configBtn.title = 'Configurar parâmetros de otimização';
        configBtn.innerHTML = '<i class="fas fa-cogs"></i>';
        configBtn.onclick = function() {
            openOptimizationConfigModal(index);
        };
        tdActions.appendChild(configBtn);
        
        // Adicionar botão para remover materialização
        const removeButton = document.createElement('button');
        removeButton.className = 'action-btn remove-btn';
        removeButton.title = 'Remover';
        removeButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeButton.onclick = function() {
            removeMaterialization(productIds[index]);
        };
        tdActions.appendChild(removeButton);
        
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
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

// Função para inicializar o botão de adicionar materialização
function initAddMaterializationButton() {
    const addButton = document.getElementById('addMaterializationBtn');
    if (!addButton) return;
    
    // Limpar conteúdo anterior e event listeners
    addButton.innerHTML = '';
    const newIcon = document.createElement('i');
    newIcon.className = 'fas fa-plus';
    addButton.appendChild(newIcon);
    
    // Remover event listeners antigos clonando e substituindo o botão
    const newButton = addButton.cloneNode(true);
    addButton.parentNode.replaceChild(newButton, addButton);
    
    // Adicionar event listener ao novo botão
    newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMaterializationSelector(this);
    });
}

// Nova função para alternar a visibilidade do dropdown
function toggleMaterializationSelector(button) {
    // Verificar se já existe um dropdown
    const existingDropdown = document.getElementById('materializationDropdownContainer');
    
    // Se existir, removê-lo
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    // Se não existir, criar e mostrar o dropdown
    showMaterializationSelector(button);
}

// Função para mostrar o seletor de materializações em um dropdown
function showMaterializationSelector(button) {
    if (!currentInstanceId) {
        showNotification('Por favor, selecione uma instância primeiro', 'error');
        return;
    }
    
    // Criar o container do dropdown
    const dropdownContainer = document.createElement('div');
    dropdownContainer.id = 'materializationDropdownContainer';
    dropdownContainer.className = 'dropdown-container';
    dropdownContainer.style.position = 'absolute';
    dropdownContainer.style.display = 'block';
    dropdownContainer.style.zIndex = '1000';
    
    // Obter a posição do botão
    const buttonRect = button.getBoundingClientRect();
    
    // Posicionar o dropdown abaixo do botão
    dropdownContainer.style.top = `${buttonRect.bottom + window.scrollY}px`;
    dropdownContainer.style.left = `${buttonRect.left + window.scrollX}px`;
    
    // Verificar se estamos usando o tema "night"
    const isNightTheme = document.documentElement.getAttribute('data-theme') === 'night';
    
    // Aplicar cores com alta especificidade
    const textColor = isNightTheme ? 'white' : '#333';
    const textMutedColor = isNightTheme ? 'rgba(255, 255, 255, 0.7)' : '#6c757d';
    const hoverBgColor = isNightTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    
    // Adicionar estilo global para garantir que as cores sejam respeitadas
    const styleEl = document.createElement('style');
    styleEl.id = 'dropdown-text-color-fix';
    styleEl.textContent = `
        #materializationDropdownContainer #materializationDropdown .dropdown-item {
            color: ${textColor} !important;
            transition: background-color 0.2s !important;
        }
        
        #materializationDropdownContainer #materializationDropdown .dropdown-item:hover {
            background-color: ${hoverBgColor} !important;
            color: ${textColor} !important;
        }
        
        #materializationDropdownContainer #materializationDropdown .empty-message {
            color: ${textMutedColor} !important;
        }
        
        /* Modificado para usar a mesma cor de texto que os outros itens */
        #materializationDropdownContainer #materializationDropdown .add-new-item {
            color: ${textColor} !important;
            font-weight: bold !important;
        }
        
        #materializationDropdownContainer #materializationDropdown .add-new-item:hover {
            color: ${textColor} !important;
        }
        
        #materializationDropdownContainer #materializationDropdown .error-message {
            color: var(--danger-color, #dc3545) !important;
        }
    `;
    document.head.appendChild(styleEl);
    
    // Criar o elemento dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'materializationDropdown';
    dropdown.className = 'dropdown-menu materialization-dropdown';
    dropdown.style.display = 'block';
    dropdown.style.minWidth = '250px';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.backgroundColor = 'var(--card-bg)';
    dropdown.style.border = '1px solid var(--border-color)';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dropdown.style.padding = '8px 0';
    
    // Adicionar mensagem de carregamento com estilo consistente
    const loadingItem = document.createElement('div');
    loadingItem.className = 'dropdown-item';
    loadingItem.textContent = 'Carregando materializações...';
    loadingItem.style.padding = '8px 16px';
    loadingItem.style.fontSize = '14px';
    loadingItem.style.color = textColor; // Aplicar cor diretamente
    loadingItem.style.cursor = 'default';
    
    dropdown.appendChild(loadingItem);
    dropdownContainer.appendChild(dropdown);
    
    // Adicionar container ao body
    document.body.appendChild(dropdownContainer);
    
    // Carregar materializações disponíveis
    fetch('/api/planification/available-materializations')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar materializações sociais');
            }
            return response.json();
        })
        .then(allMaterializations => {
            // Limpar dropdown
            dropdown.innerHTML = '';
            
            // Filtrar materializações já existentes
            const existingIds = productIds || [];
            const availableMaterializations = allMaterializations.filter(
                mat => !existingIds.includes(mat.id)
            );
            
            // Se não houver materializações disponíveis
            if (availableMaterializations.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'dropdown-item empty-message';
                emptyItem.textContent = 'Não há materializações sociais disponíveis';
                emptyItem.style.padding = '12px 16px';
                emptyItem.style.fontSize = '14px';
                emptyItem.style.color = textMutedColor + ' !important'; // Aplicar cor diretamente com !important
                emptyItem.style.fontStyle = 'italic';
                emptyItem.style.textAlign = 'center';
                dropdown.appendChild(emptyItem);
                return;
            }
            
            // Adicionar materializações ao dropdown
            availableMaterializations.forEach(mat => {
                const item = document.createElement('a');
                item.href = "#";
                item.className = 'dropdown-item';
                item.dataset.id = mat.id;
                item.dataset.name = mat.name;
                item.textContent = `${mat.name} (${mat.type})`;
                item.style.padding = '8px 16px';
                item.style.fontSize = '14px';
                item.style.color = `${textColor} !important`; // Aplicar cor com !important
                item.style.textDecoration = 'none';
                item.style.display = 'block';
                item.style.cursor = 'pointer';
                
                // Adicionar estilo inline de !important não funciona diretamente, então usamos setAttribute
                item.setAttribute('style', `
                    padding: 8px 16px;
                    font-size: 14px;
                    color: ${textColor} !important;
                    text-decoration: none;
                    display: block;
                    cursor: pointer;
                    background-color: transparent;
                `);
                
                item.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    addMaterializationToTable(mat, currentInstanceId);
                };
                
                dropdown.appendChild(item);
            });
            
            // Adicionar opção para criar nova materialização
            const newItem = document.createElement('a');
            newItem.href = "#";
            newItem.className = 'dropdown-item add-new-item';
            newItem.innerHTML = '<i class="fas fa-plus-circle"></i> Nova Materialização Social';
            
            // Aplicar estilos com alta especificidade, agora usando a mesma cor de texto
            newItem.setAttribute('style', `
                padding: 8px 16px;
                font-size: 14px;
                color: ${textColor} !important;
                text-decoration: none;
                display: block;
                cursor: pointer;
                font-weight: bold;
                border-top: 1px solid var(--border-color);
                margin-top: 4px;
                padding-top: 10px;
                background-color: transparent;
            `);
            
            newItem.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                showNewMaterializationModal();
            };
            
            dropdown.appendChild(newItem);
        })
        .catch(error => {
            console.error('Erro ao carregar materializações:', error);
            
            const errorItem = document.createElement('div');
            errorItem.className = 'dropdown-item error-message';
            errorItem.textContent = 'Erro ao carregar materializações';
            errorItem.style.padding = '8px 16px';
            errorItem.style.fontSize = '14px';
            errorItem.style.color = 'var(--danger-color, #dc3545) !important';
            errorItem.style.fontWeight = 'bold';
            
            dropdown.innerHTML = '';
            dropdown.appendChild(errorItem);
            
            showNotification("Erro ao carregar materializações sociais", "error");
        });
    
    // Adicionar evento para remover os estilos quando o dropdown for fechado
    const removeDropdownStyles = function() {
        const styleElement = document.getElementById('dropdown-text-color-fix');
        if (styleElement) {
            styleElement.remove();
        }
    };
    
    // Adicionar evento global para fechar ao clicar fora
    const documentClickHandler = function closeDropdownOnClickOutside(e) {
        if (dropdownContainer && 
            !dropdownContainer.contains(e.target) && 
            e.target !== button && 
            !button.contains(e.target)) {
            
            if (document.body.contains(dropdownContainer)) {
                dropdownContainer.remove();
                removeDropdownStyles();
            }
            document.removeEventListener('click', documentClickHandler);
        }
    };
    
    // Adicionar evento com delay para evitar fechamento imediato
    setTimeout(() => {
        document.addEventListener('click', documentClickHandler);
    }, 100);
}

// Função para adicionar materialização selecionada à tabela
// Versão adaptada para popularcouncil.js (sem matriz tecnológica)
function addMaterializationToTable(materialization, instanceId) {
    // Fechar o dropdown
    const dropdownContainer = document.getElementById('materializationDropdownContainer');
    if (dropdownContainer) {
        dropdownContainer.remove();
    }
    
    // Adicionar materialização aos arrays
    productIds.push(materialization.id);
    productNames.push(materialization.name);
    
    // Track this as a newly added materialization
    if (!originalMaterializationIds.includes(materialization.id)) {
        newlyAddedMaterializationIds.push(materialization.id);
    }
    
    // Adicionar ao vetor de demanda
    demandVector.push(0);
    
    // Re-renderizar vetor de demanda
    renderDemandVector();
    
    showNotification(`Materialização "${materialization.name}" adicionada com sucesso`, 'success');
}

// Função para mostrar o modal de criação de nova materialização
function showNewMaterializationModal() {
    // Fechar o dropdown de materialização se estiver aberto
    const dropdown = document.querySelector('#materializationDropdownContainer');
    if (dropdown) dropdown.remove();
    
    // Obter o elemento modal
    const modal = document.getElementById('newMaterializationModal');
    if (!modal) {
        console.error("Modal para nova materialização não encontrada");
        showNotification("Erro: Modal para nova materialização não encontrada", "error");
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
                        <option value="PRODUCT">Produto</option>
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
    
    // Exibir o modal
    modal.style.display = 'block';
    
    // Carregar setores para o dropdown
    loadSectorsForDropdown();
}

// Função para fechar o modal de nova materialização
function closeNewMaterializationModal() {
    const modal = document.getElementById('newMaterializationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Função para carregar setores para o dropdown
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
            // Limpar opção de carregamento
            sectorSelect.innerHTML = '<option value="">Selecione um setor</option>';
            
            // Adicionar setores ao dropdown
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

// Função para salvar nova materialização
function saveNewMaterialization() {
    // Obter valores do formulário
    const name = document.getElementById('newMaterializationName').value.trim();
    const type = document.getElementById('newMaterializationType').value;
    const sectorId = document.getElementById('newMaterializationSector').value;
    
    // Validar formulário
    if (!name || !type || !sectorId) {
        const errorElement = document.getElementById('newMaterializationError');
        errorElement.textContent = 'Todos os campos são obrigatórios';
        errorElement.style.display = 'block';
        return;
    }
    
    // Mostrar spinner
    const spinner = document.getElementById('newMaterializationSpinner');
    spinner.style.display = 'inline-block';
    
    // Preparar dados
    const data = {
        name: name,
        type: type,
        sectorId: parseInt(sectorId)
    };
    
    // Enviar requisição
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
        // Fechar modal
        closeNewMaterializationModal();
        
        // Mostrar mensagem de sucesso
        showSuccess(`Materialização "${result.name}" criada com sucesso`);
        
        // Adicionar à tabela se estivermos em um contexto de planificação
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
        // Esconder spinner
        spinner.style.display = 'none';
    });
}

// Function to remove a materialization from the table (simplified for popularcouncil.js)
function removeMaterialization(materializationId) {
    // Confirmar antes de remover
    if (!confirm('Tem certeza que deseja remover esta materialização?')) {
        return;
    }
    
    console.log(`Removendo materialização com ID: ${materializationId}`);
    
    // Check if this was a newly added materialization that hasn't been saved yet
    const newlyAddedIndex = newlyAddedMaterializationIds.indexOf(materializationId);
    if (newlyAddedIndex !== -1) {
        // If it's a newly added one, just remove it from the tracking list
        newlyAddedMaterializationIds.splice(newlyAddedIndex, 1);
    } else if (originalMaterializationIds.includes(materializationId)) {
        // Only track removal of materializations that existed in the database
        if (!window.removedMaterializationIds) {
            window.removedMaterializationIds = [];
        }
        
        // Add this ID to our tracking array of removed materializations
        if (!window.removedMaterializationIds.includes(materializationId)) {
            window.removedMaterializationIds.push(materializationId);
        }
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
    
    // Remove from the demandVector
    demandVector.splice(matIndex, 1);
    
    // Re-render demand vector table
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

// Modificando a função ensureMatrixDimensions para não tentar atualizar a matriz tecnológica
function ensureMatrixDimensions() {
    const size = productIds.length;
    
    // Garantir que o vetor de demanda tenha o tamanho correto
    while (demandVector.length < size) {
        demandVector.push(0);
    }
    while (demandVector.length > size) {
        demandVector.pop();
    }
}

/**
 * Salva as alterações no vetor de demanda
 */
function saveChanges() {
    if (!currentInstanceId) {
        showError("Selecione uma instância primeiro");
        return;
    }
    
    // Mostrar spinner de carregamento
    document.getElementById('loadingSpinner').style.display = 'inline-block';
    
    try {
        // 1. Atualizar vetor de demanda com os dados atuais da interface
        updateDemandVectorFromUI();
        
        // 2. Prepare all promises that will be executed
        const allPromises = [];
        
        // Debug log para ajudar a identificar problemas
        console.log("Estado atual antes de salvar:");
        console.log("- productIds:", productIds);
        console.log("- originalIds:", originalMaterializationIds);
        console.log("- newlyAddedIds:", newlyAddedMaterializationIds);
        console.log("- removedIds:", window.removedMaterializationIds || []);
        console.log("- demandVector:", demandVector);
        
        // 3. Create deletion promises for the tracked removed materializations
        if (window.removedMaterializationIds && window.removedMaterializationIds.length > 0) {
            console.log("Excluindo materializações removidas:", window.removedMaterializationIds);
            
            window.removedMaterializationIds.forEach(materializationId => {
                // First check if this ID was in the original list (existed in the database)
                if (originalMaterializationIds.includes(materializationId)) {
                    // Directly delete other related data first to ensure proper cleanup
                    const deleteOptimizationPromise = fetch(`/api/planification/optimization/${materializationId}/instance/${currentInstanceId}`, {
                        method: 'DELETE'
                    }).then(response => {
                        if (!response.ok && response.status !== 404) {
                            return response.text().then(text => {
                                console.warn(`Aviso ao excluir configuração de otimização para materialização ${materializationId}:`, text);
                            });
                        }
                        return response;
                    });
                    allPromises.push(deleteOptimizationPromise);
                    
                    // Delete the demand vector which triggers cascading deletion
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
                } else {
                    console.log(`Materialização ${materializationId} não existia no servidor, ignorando exclusão`);
                }
            });
        }
        
        // 4. Create promises to save/update each entry in the demand vector
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
        
        // 5. Execute all promises
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
                originalMaterializationIds = [...productIds];
                newlyAddedMaterializationIds = [];  // Clear newly added tracking
                
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

// Mantém o restante do código dentro do evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded event fired in popularcouncil.js ===');
    
    // Inicializar cabeçalho comum - APENAS UMA VEZ
    try {
        ensureHeader();
        console.log('ensureHeader() executed successfully');
    } catch (error) {
        console.error('Error in ensureHeader():', error);
    }
    
    // Elementos principais da interface
    const instanceSelect = document.getElementById('instanceSelect');
    const matrixSection = document.getElementById('matrixSection');
    const demandVectorTable = document.getElementById('demandVector');
    const saveButton = document.getElementById('saveButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsContainer = document.getElementById('results');
    const productionVectorTable = document.getElementById('productionVector');
    const optimizationResultsTable = document.getElementById('optimizationResults');
    
    // Debug: Check if instanceSelect exists
    console.log('instanceSelect element:', instanceSelect);
    if (!instanceSelect) {
        console.error('ERROR: instanceSelect element not found!');
        showError('Erro crítico: Elemento de seleção de instância não encontrado.');
        return;
    }
    
    // Carregar lista de instâncias
    console.log('Calling loadInstances()...');
    loadInstances();
    
    // Configurar eventos
    instanceSelect.addEventListener('change', handleInstanceChange);
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
        console.log('loadInstances() called');
        console.log('Fetching from: /api/instances?type=POPULARCOUNCIL');
        
        fetch('/api/instances?type=POPULARCOUNCIL')
            .then(response => {
                console.log('API response status:', response.status);
                if (!response.ok) {
                    throw new Error('Erro ao carregar instâncias de conselho');
                }
                return response.json();
            })
            .then(instances => {
                console.log('Instances received:', instances);
                console.log('Number of instances:', instances.length);
                
                // Limpar opções existentes
                while (instanceSelect.options.length > 1) {
                    instanceSelect.remove(1);
                }
                
                // Adicionar novas opções
                instances.forEach(instance => {
                    const option = document.createElement('option');
                    option.value = instance.id;
                    option.textContent = instance.name || `Conselho #${instance.id}`;
                    instanceSelect.appendChild(option);
                    console.log(`Added option: ${option.textContent} (ID: ${option.value})`);
                });
                
                console.log('Successfully loaded', instances.length, 'councils into dropdown');
            })
            .catch(error => {
                console.error('Error in loadInstances():', error);
                showError('Erro ao carregar instâncias de conselho: ' + error.message);
            });
    }
    
    /**
     * Manipula a mudança de instância selecionada
     */
    function handleInstanceChange() {
        const instanceId = instanceSelect.value;
        
        if (!instanceId) {
            matrixSection.style.display = 'none';
            return;
        }
        
        // Chamar a função loadInstanceData que carrega os dados da instância
        loadInstanceData(instanceId);
    }
    
    /**
     * Carrega o vetor de demanda da instância selecionada
     */
    function loadDemandVector(instanceId) {
        console.log(`Carregando vetor de demanda para instância ${instanceId}`);
        
        // Usar diretamente o endpoint que não filtra por matriz tecnológica
        return fetch(`/api/planification/demand-vector/by-instance/${instanceId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar vetor de demanda: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Dados do vetor de demanda recebidos:", data);
                
                if (data.vector) {
                    demandVector = data.vector;
                }
                
                if (data.productNames) {
                    productNames = data.productNames;
                }
                
                if (data.productIds) {
                    productIds = data.productIds;
                    // Store the original IDs for tracking changes
                    originalMaterializationIds = [...data.productIds];
                    // Clear the newly added IDs since we just loaded fresh data
                    newlyAddedMaterializationIds = [];
                }
                
                // Garantir consistência dos dados
                if (demandVector.length !== productNames.length || demandVector.length !== productIds.length) {
                    console.warn(`Inconsistência nos dados: demandVector(${demandVector.length}), productNames(${productNames.length}), productIds(${productIds.length})`);
                    ensureMatrixDimensions();
                }
                
                // Logar o estado para depuração
                console.log("Estado após carregamento:");
                console.log("- productIds:", productIds);
                console.log("- productNames:", productNames);
                console.log("- demandVector:", demandVector);
                
                // Renderizar o vetor na interface
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
     * Carrega todos os dados da instância selecionada
     */
    function loadInstanceData(instanceId) {
        currentInstanceId = instanceId;
        
        // Mostrar spinner de carregamento
        document.getElementById('loadingSpinner').style.display = 'inline-block';
        
        // Limpar configurações de otimização existentes
        Object.keys(optimizationConfigs).forEach(key => delete optimizationConfigs[key]);
        
        // Carregar vetor de demanda
        loadDemandVector(instanceId)
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
                // Mostrar a seção
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
    
    // Primeiro mostrar as instâncias filhas e só depois prosseguir com o cálculo
    loadAndShowChildInstances(instanceId)
        .catch(error => {
            console.error('Erro:', error);
            // O erro já é tratado dentro da função loadAndShowChildInstances
        });
}

// Function to update demand vector data from UI
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

// Function to remove a materialization from the tables
function removeMaterialization(materializationId) {
    // Confirmar antes de remover
    if (!confirm('Tem certeza que deseja remover esta materialização? Isso também removerá a linha e coluna correspondente na matriz tecnológica.')) {
        return;
    }
    
    console.log(`Removendo materialização com ID: ${materializationId}`);
    
    // Check if this was a newly added materialization that hasn't been saved yet
    const newlyAddedIndex = newlyAddedMaterializationIds.indexOf(materializationId);
    if (newlyAddedIndex !== -1) {
        // If it's a newly added one, just remove it from the tracking list
        newlyAddedMaterializationIds.splice(newlyAddedIndex, 1);
    } else if (originalMaterializationIds.includes(materializationId)) {
        // Only track removal of materializations that existed in the database
        if (!window.removedMaterializationIds) {
            window.removedMaterializationIds = [];
        }
        
        // Add this ID to our tracking array of removed materializations
        if (!window.removedMaterializationIds.includes(materializationId)) {
            window.removedMaterializationIds.push(materializationId);
        }
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

/**
 * Atualiza o vetor de demanda com os novos valores calculados
 * @param {Object} demandVectorData - Dados do vetor de demanda
 */
function updateDemandVector(demandVectorData) {
    if (!demandVectorData || !demandVectorData.vector) {
        console.error("Dados de vetor de demanda inválidos:", demandVectorData);
        showNotification('Dados de vetor de demanda inválidos', 'error');
        return;
    }
    
    console.log('Atualizando vetor de demanda com dados recebidos:', demandVectorData);
    
    // Verificar se os nomes dos produtos e IDs serão atualizados antes do vetor
    // para garantir sincronização entre os arrays
    if (demandVectorData.productNames && demandVectorData.productNames.length > 0) {
        productNames = demandVectorData.productNames;
        console.log("Nomes de produtos atualizados:", productNames);
    }
    
    if (demandVectorData.productIds && demandVectorData.productIds.length > 0) {
        productIds = demandVectorData.productIds;
        console.log("IDs de produtos atualizados:", productIds);
    }
    
    // Atualizar vetor de demanda global
    demandVector = demandVectorData.vector;
    console.log("Vetor de demanda atualizado:", demandVector);
    
    // Garantir que as dimensões da matriz tecnológica e vetor de demanda estejam sincronizadas
    ensureMatrixDimensions();
    
    // Renderizar o vetor na interface
    renderDemandVector();
    
    // Mostrar mensagem de sucesso
    showNotification('Vetor de demanda atualizado com sucesso', 'success');
}

/**
 * Atualiza um elemento individual no vetor de demanda
 * @param {number} index - Índice do elemento a ser atualizado
 * @param {string|number} value - Novo valor
 */
function updateDemandVectorElement(index, value) {
    if (index >= 0 && index < demandVector.length) {
        demandVector[index] = parseFloat(value) || 0;
        pageState.isDirty = true;
    }
}

/**
 * Função para garantir que as dimensões dos vetores correspondam corretamente
 */
function ensureMatrixDimensions() {
    const size = productIds.length;
    
    // Garantir que o vetor de demanda tenha o tamanho correto
    while (demandVector.length < size) {
        demandVector.push(0);
    }
    while (demandVector.length > size) {
        demandVector.pop();
    }
}