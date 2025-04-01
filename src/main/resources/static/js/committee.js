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
// Adicionar variável para rastrear o tipo da instância atual
let currentInstanceType = null;

// Função para carregar as instâncias de comitê no dropdown
function loadInstances() {
    const instanceSelect = document.getElementById('instanceSelect');
    
    if (!instanceSelect) {
        console.error('Elemento de seleção de instâncias não encontrado');
        return;
    }
    
    fetch('/api/instances/by-type/COMMITTEE')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar instâncias de comitê');
            }
            return response.json();
        })
        .then(instances => {
            console.log('Instâncias de comitê carregadas:', instances);
            
            // Limpar opções existentes, mantendo apenas a opção padrão
            instanceSelect.innerHTML = '<option value="">Selecione uma instância...</option>';
            
            // Adicionar opções ao select
            instances.forEach(instance => {
                const option = document.createElement('option');
                option.value = instance.id;
                option.textContent = instance.committeeName || `Comitê #${instance.id}`;
                instanceSelect.appendChild(option);
            });
            
            // Verificar se há um ID de instância na URL
            const urlParams = new URLSearchParams(window.location.search);
            const instanceIdFromUrl = urlParams.get('instanceId');
            
            if (instanceIdFromUrl) {
                instanceSelect.value = instanceIdFromUrl;
                // Disparar evento para carregar os dados desta instância
                instanceSelect.dispatchEvent(new Event('change'));
            }
        })
        .catch(error => {
            console.error('Erro ao carregar instâncias:', error);
            showError('Erro ao carregar instâncias de comitê. Por favor, tente novamente mais tarde.');
        });
}

// Configurar event listeners quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inserir o cabeçalho comum
    ensureHeader();
    
    // Carregar instâncias
    loadInstances();
    
    // Event listener para quando uma instância for selecionada
    const instanceSelect = document.getElementById('instanceSelect');
    instanceSelect.addEventListener('change', function() {
        const instanceId = this.value;
        
        // Limpar dados anteriores
        document.getElementById('matrixSection').style.display = 'none';
        document.getElementById('results').style.display = 'none';
        
        if (!instanceId) {
            return; // Nenhuma instância selecionada
        }
        
        // Armazenar o ID da instância selecionada
        currentInstanceId = instanceId;
        
        // Guardar o tipo da instância como COMMITTEE para renderização específica
        currentInstanceType = 'COMMITTEE';
        
        // Mostrar spinner de carregamento
        document.getElementById('loadingSpinner').style.display = 'inline-block';
        
        // Carregar dados desta instância
        Promise.all([
            fetch(`/api/planification/instances/${instanceId}/data`).then(res => res.json()),
            loadDemandStock(instanceId),
            loadWorkersProposal(instanceId),
            loadProductionTarget(instanceId),
            loadPreviousResults(instanceId),
            loadTechnologicalCoefficients(instanceId)
        ])
        .then(([instanceData]) => {
            // Armazenar dados
            productNames = instanceData.productNames || [];
            productIds = instanceData.productIds || [];
            technologicalMatrix = instanceData.technologicalMatrix || [];
            demandVector = instanceData.demandVector || [];
            
            // Renderizar interface
            renderTechnologicalMatrix();
            renderDemandVectorTable();
            
            // Mostrar seções
            document.getElementById('matrixSection').style.display = 'block';
            document.getElementById('committeeControls').style.display = 'flex';
            
            // Configurar botão para abrir modal de proposta
            document.getElementById('openPropostaBtn').addEventListener('click', function() {
                openPropostaModal();
            });
        })
        .catch(error => {
            console.error('Erro ao carregar dados da instância:', error);
            showError('Erro ao carregar dados da instância');
        })
        .finally(() => {
            // Esconder spinner de carregamento
            document.getElementById('loadingSpinner').style.display = 'none';
        });
    });
    
    // Event listener para botão de planificar
    document.getElementById('planifyButton').addEventListener('click', function() {
        planify();
    });
    
    // Event listener para botão de salvar
    document.getElementById('saveButton').addEventListener('click', function() {
        saveChanges();
    });
});

// Função específica para carregar os coeficientes do vetor tecnológico
function loadTechnologicalCoefficients(instanceId) {
    console.log(`Carregando coeficientes tecnológicos para a instância ${instanceId}...`);
    
    return fetch(`/api/planification/technological-tensor/by-instance/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dados de coeficientes tecnológicos carregados:', data);
            // Armazenar os dados em uma variável global para uso posterior
            window.technologicalCoefficients = data;
            return data;
        })
        .catch(error => {
            console.error('Erro ao carregar coeficientes tecnológicos:', error);
            return [];
        });
}

// Renderizar a tabela do vetor de demanda
function renderDemandVectorTable() {
    const demandTable = document.getElementById('demandVector');
    if (!demandTable) return;
    
    const tbody = demandTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    productNames.forEach((name, index) => {
        const value = index < demandVector.length ? demandVector[index] : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${name}</td>
            <td>
                <input type="number" step="0.01" min="0" value="${value}" 
                       data-index="${index}"
                       onchange="updateDemandVector(${index}, this)" />
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn remove-btn" onclick="removeDemandItem(${index})"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Função auxiliar para atualizar o vetor de demanda quando os valores mudam
function updateDemandVector(index, input) {
    if (index >= 0 && index < demandVector.length) {
        const value = parseFloat(input.value) || 0;
        demandVector[index] = value;
    }
}

// Function to render the technological matrix/vector
function renderTechnologicalMatrix() {
    if (!technologicalMatrix || !productNames) {
        console.error("Matriz tecnológica ou nomes de produtos não definidos");
        return;
    }
    
    const technologicalMatrixTable = document.getElementById('technologicalMatrix');
    if (!technologicalMatrixTable) {
        console.error("Tabela de matriz tecnológica não encontrada");
        return;
    }
    
    // Limpar tabela
    const thead = technologicalMatrixTable.querySelector('thead tr');
    const tbody = technologicalMatrixTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Debug: Verificar os dados da matriz
    console.log("Renderizando matriz tecnológica:", {
        tipo: currentInstanceType,
        matriz: technologicalMatrix,
        tamanho: technologicalMatrix.length,
        produtos: productNames,
        coeficientesCarregados: window.technologicalCoefficients ? true : false
    });
    
    // Usar os coeficientes carregados diretamente do backend, se disponíveis
    const coefficients = window.technologicalCoefficients || [];
    
    // Verificar se estamos lidando com um comitê (vetor tecnológico) ou conselho (matriz tecnológica)
    if (currentInstanceType === 'COMMITTEE') {
        // Para comitês, mostrar o vetor de insumos (o que entra na produção)
        
        // Se temos coeficientes carregados do backend, usá-los
        if (coefficients && coefficients.length > 0) {
            // Determinar qual é a materialização de saída (produto do comitê)
            // Em geral, para um comitê, haverá apenas uma materialização de saída
            const uniqueOutputIds = [...new Set(coefficients.map(c => c.outputMaterializationId))];
            console.log("IDs de materializações de saída:", uniqueOutputIds);
            
            if (uniqueOutputIds.length > 0) {
                // Filtrar coeficientes apenas para a primeira materialização de saída
                const outputId = uniqueOutputIds[0];
                const relevantCoefficients = coefficients.filter(c => 
                    c.outputMaterializationId === outputId);
                
                console.log(`Encontrados ${relevantCoefficients.length} coeficientes para a materialização de saída ${outputId}`);
                
                // Se temos coeficientes, renderizar cada um
                if (relevantCoefficients.length > 0) {
                    relevantCoefficients.forEach(coef => {
                        // Usar diretamente o nome do insumo que vem do backend
                        // Este é o nome da materialização social usada como insumo
                        const inputName = coef.inputMaterializationName || `Insumo #${coef.inputMaterializationId}`;
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${inputName}</td>
                            <td>
                                <input type="number" step="0.01" min="0" value="${coef.quantity}" 
                                      data-input-id="${coef.inputMaterializationId}" 
                                      data-output-id="${coef.outputMaterializationId}" 
                                      onchange="updateCoefficientValue(this)" />
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    // Nenhum coeficiente encontrado
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td colspan="2" class="text-center">Não há dados de coeficientes disponíveis</td>`;
                    tbody.appendChild(tr);
                }
            } else {
                // Nenhuma materialização de saída encontrada
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="2" class="text-center">Não há dados de coeficientes disponíveis</td>`;
                tbody.appendChild(tr);
            }
        } else {
            // Fallback: usar a primeira coluna da matriz tecnológica como antes
            // Este caso ocorre quando os coeficientes não puderam ser carregados diretamente
            
            // Verificar se temos dados na matriz
            if (technologicalMatrix.length > 0 && technologicalMatrix[0].length > 0) {
                let hasAnyRows = false;
                
                productNames.forEach((name, rowIndex) => {
                    if (rowIndex < technologicalMatrix.length) {
                        // Para cada insumo, mostramos seu coeficiente na coluna 0
                        const coeff = technologicalMatrix[rowIndex][0] || 0;
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${name}</td>
                            <td>
                                <input type="number" step="0.01" min="0" value="${coeff}" 
                                      data-row="${rowIndex}" data-col="0" 
                                      onchange="technologicalMatrix[${rowIndex}][0] = parseFloat(this.value) || 0" />
                            </td>
                        `;
                        tbody.appendChild(tr);
                        hasAnyRows = true;
                    }
                });
                
                if (!hasAnyRows) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td colspan="2" class="text-center">Não há dados de insumos disponíveis</td>`;
                    tbody.appendChild(tr);
                }
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="2" class="text-center">Não há dados de insumos disponíveis</td>`;
                tbody.appendChild(tr);
            }
        }
    } else {
        // Para conselho, renderizamos a matriz completa como antes
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th></th>';
        
        // Adicionar cabeçalhos de colunas
        productNames.forEach(name => {
            const th = document.createElement('th');
            th.textContent = name;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
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
            
            tbody.appendChild(tr);
        });
    }
}

// Função para atualizar um coeficiente quando o usuário alterar o valor
function updateCoefficientValue(input) {
    const inputId = parseInt(input.dataset.inputId);
    const outputId = parseInt(input.dataset.outputId);
    const value = parseFloat(input.value) || 0;
    
    console.log(`Atualizando coeficiente: insumo=${inputId}, produto=${outputId}, valor=${value}`);
    
    // Atualizar no cache local
    if (window.technologicalCoefficients) {
        const coefficient = window.technologicalCoefficients.find(
            c => c.inputMaterializationId === inputId && c.outputMaterializationId === outputId
        );
        
        if (coefficient) {
            coefficient.quantity = value;
        }
    }
    
    // Também atualizar na matriz tecnológica para compatibilidade com o código existente
    if (technologicalMatrix && technologicalMatrix.length > 0) {
        // Encontrar o índice do insumo e do produto na matriz
        const inputIndex = productIds.indexOf(inputId);
        const outputIndex = productIds.indexOf(outputId);
        
        if (inputIndex >= 0 && outputIndex >= 0) {
            technologicalMatrix[inputIndex][outputIndex] = value;
        }
    }
}

// Funções para modais
function openPropostaModal() {
    document.getElementById('unitName').textContent = 
        document.getElementById('instanceSelect').options[document.getElementById('instanceSelect').selectedIndex].text;
    
    // Carregar dados
    loadPropostaData(currentInstanceId);
    
    // Mostrar modal
    document.getElementById('propostaModal').style.display = 'flex';
}

function closePropostaModal() {
    document.getElementById('propostaModal').style.display = 'none';
    document.getElementById('propostaError').style.display = 'none';
}

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

// Adicionar esta função para atualizar valores da matriz a partir da interface
function updateMatrixAndVectorData() {
    // Atualizar vetor de demanda
    updateDemandVectorFromUI();
    
    // Atualizar matriz tecnológica para COMMITTEE
    if (currentInstanceType === 'COMMITTEE') {
        const technologicalMatrixTable = document.getElementById('technologicalMatrix');
        const rows = technologicalMatrixTable.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const input = cells[1].querySelector('input');
                if (input) {
                    const rowIndex = parseInt(input.dataset.row);
                    if (!isNaN(rowIndex) && rowIndex >= 0 && rowIndex < technologicalMatrix.length) {
                        technologicalMatrix[rowIndex][0] = parseFloat(input.value) || 0;
                    }
                }
            }
        });
        
        console.log("Matriz atualizada:", technologicalMatrix);
    }
}

// Implementação das funções para carregar dados de comitê
function loadDemandStock(instanceId) {
    console.log(`Carregando dados de estoque e demanda para o comitê ${instanceId}...`);
    
    return fetch(`/api/demand-stock/instance/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('Nenhum dado de estoque encontrado para esta instância');
                    return [];
                }
                throw new Error('Erro ao carregar dados de estoque');
            }
            return response.json();
        })
        .then(stockData => {
            console.log('Dados de estoque carregados:', stockData);
            renderDemandStockTable(stockData);
            return stockData;
        })
        .catch(error => {
            console.error('Erro ao carregar dados de estoque:', error);
            showError('Não foi possível carregar dados de estoque');
            return [];
        });
}

function renderDemandStockTable(stockData) {
    const table = document.getElementById('demandStockTable');
    if (!table) {
        console.error('Tabela de estoque/demanda não encontrada');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (stockData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-center">Não há dados de estoque/demanda disponíveis</td>';
        tbody.appendChild(tr);
        return;
    }
    
    stockData.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.materializationId = item.materializationId;
        
        // Calcula o saldo (estoque - demanda)
        const stock = parseFloat(item.currentStock) || 0;
        const demand = parseFloat(item.demand) || 0;
        const balance = stock - demand;
        
        tr.innerHTML = `
            <td>${item.materializationName || 'Não especificado'}</td>
            <td>
                <input type="number" class="form-control stock-input" 
                    value="${stock}" 
                    data-id="${item.materializationId}"
                    onchange="updateStockValue(${item.materializationId}, this.value)">
            </td>
            <td>
                <input type="number" class="form-control demand-input" 
                    value="${demand}" 
                    data-id="${item.materializationId}"
                    onchange="updateDemandValue(${item.materializationId}, this.value)">
            </td>
            <td class="balance-cell ${balance < 0 ? 'negative' : ''}">${balance.toFixed(2)}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adicionar estilos para células de saldo negativo
    const style = document.createElement('style');
    style.textContent = `
        .balance-cell.negative {
            color: #dc3545;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

function updateStockValue(materializationId, value) {
    if (!currentInstanceId) return;
    
    const stockValue = parseFloat(value) || 0;
    console.log(`Atualizando estoque para materialização ${materializationId}: ${stockValue}`);
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Aqui você pode implementar uma lógica para salvar automaticamente
    // ou adicionar o valor a uma fila de alterações pendentes
}

function updateDemandValue(materializationId, value) {
    if (!currentInstanceId) return;
    
    const demandValue = parseFloat(value) || 0;
    console.log(`Atualizando demanda para materialização ${materializationId}: ${demandValue}`);
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Aqui você pode implementar uma lógica para salvar automaticamente
    // ou adicionar o valor a uma fila de alterações pendentes
}

function updateBalanceCell(materializationId) {
    const row = document.querySelector(`tr[data-materialization-id="${materializationId}"]`);
    if (!row) return;
    
    const stockInput = row.querySelector('.stock-input');
    const demandInput = row.querySelector('.demand-input');
    const balanceCell = row.querySelector('.balance-cell');
    
    if (!stockInput || !demandInput || !balanceCell) return;
    
    const stock = parseFloat(stockInput.value) || 0;
    const demand = parseFloat(demandInput.value) || 0;
    const balance = stock - demand;
    
    balanceCell.textContent = balance.toFixed(2);
    balanceCell.classList.toggle('negative', balance < 0);
}

function loadWorkersProposal(instanceId) {
    console.log(`Carregando proposta de trabalhadores para o comitê ${instanceId}...`);
    
    return fetch(`/api/workers-proposal/instance/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('Nenhuma proposta de trabalhadores encontrada para esta instância');
                    return null;
                }
                throw new Error('Erro ao carregar proposta de trabalhadores');
            }
            return response.json();
        })
        .then(proposalData => {
            console.log('Proposta de trabalhadores carregada:', proposalData);
            // Armazenar dados para uso posterior na modal
            window.currentWorkersProposal = proposalData;
            return proposalData;
        })
        .catch(error => {
            console.error('Erro ao carregar proposta de trabalhadores:', error);
            // Não mostrar erro ao usuário, apenas criar um objeto vazio para usar depois
            window.currentWorkersProposal = null;
            return null;
        });
}

function loadProductionTarget(instanceId) {
    console.log(`Carregando metas de produção para o comitê ${instanceId}...`);
    
    return fetch(`/api/instances/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar dados da instância');
            }
            return response.json();
        })
        .then(instanceData => {
            console.log('Dados da instância carregados:', instanceData);
            
            // Preencher a tabela de produção e meta
            const producedQuantityInput = document.getElementById('producedQuantity');
            const remainingQuantityCell = document.getElementById('remainingQuantity');
            
            if (producedQuantityInput && remainingQuantityCell) {
                const producedQuantity = instanceData.producedQuantity || 0;
                const targetQuantity = instanceData.targetQuantity || 0;
                const remainingQuantity = targetQuantity - producedQuantity;
                
                producedQuantityInput.value = producedQuantity;
                remainingQuantityCell.textContent = remainingQuantity.toFixed(2);
                
                // Destacar se falta produzir
                if (remainingQuantity > 0) {
                    remainingQuantityCell.classList.add('remaining-positive');
                } else {
                    remainingQuantityCell.classList.remove('remaining-positive');
                }
                
                // Adicionar evento para atualizar a quantidade restante quando a produção mudar
                producedQuantityInput.addEventListener('input', function() {
                    const newProducedQuantity = parseFloat(this.value) || 0;
                    const newRemainingQuantity = targetQuantity - newProducedQuantity;
                    remainingQuantityCell.textContent = newRemainingQuantity.toFixed(2);
                    
                    // Destacar se falta produzir
                    if (newRemainingQuantity > 0) {
                        remainingQuantityCell.classList.add('remaining-positive');
                    } else {
                        remainingQuantityCell.classList.remove('remaining-positive');
                    }
                });
                
                // Adicionar estilo para quantidade restante
                const style = document.createElement('style');
                style.textContent = `
                    .remaining-positive {
                        font-weight: bold;
                        color: var(--warning-color, #fd7e14);
                    }
                `;
                document.head.appendChild(style);
            }
            
            return instanceData;
        })
        .catch(error => {
            console.error('Erro ao carregar metas de produção:', error);
            return null;
        });
}

// Funções para a modal de proposta
function loadPropostaData(instanceId) {
    console.log(`Carregando dados de proposta para a instância ${instanceId}...`);
    
    // Se já carregamos os dados antes, usar esses
    if (window.currentWorkersProposal) {
        fillPropostaModal(window.currentWorkersProposal);
        return Promise.resolve(window.currentWorkersProposal);
    }
    
    // Se não, buscar do servidor
    document.getElementById('propostaSpinner').style.display = 'inline-block';
    
    return fetch(`/api/workers-proposal/instance/${instanceId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // Não encontrou, vamos mostrar valores padrão
                    return null;
                }
                throw new Error('Erro ao carregar proposta de trabalhadores');
            }
            return response.json();
        })
        .then(data => {
            fillPropostaModal(data || createEmptyProposal());
            return data;
        })
        .catch(error => {
            console.error('Erro ao carregar proposta:', error);
            fillPropostaModal(createEmptyProposal());
            return null;
        })
        .finally(() => {
            document.getElementById('propostaSpinner').style.display = 'none';
        });
}

function fillPropostaModal(proposalData) {
    // Se não há dados, criar um objeto vazio com valores padrão
    const data = proposalData || createEmptyProposal();
    
    // Preencher os campos da modal
    document.getElementById('workerLimitProposta').value = data.workerLimit || '';
    document.getElementById('workerHoursProposta').value = data.workerHours || '';
    document.getElementById('productionTimeProposta').value = data.productionTime || '';
    document.getElementById('weeklyScaleProposta').value = data.weeklyScale || '';
    document.getElementById('nightShiftProposta').checked = data.nightShift || false;
}

function createEmptyProposal() {
    return {
        workerLimit: 100,
        workerHours: 8,
        productionTime: 1,
        weeklyScale: 5,
        nightShift: false
    };
}

function savePropostaInputs() {
    if (!currentInstanceId) {
        showError('É necessário selecionar uma instância primeiro');
        return;
    }
    
    const propostaError = document.getElementById('propostaError');
    propostaError.style.display = 'none';
    
    // Capturar valores dos campos
    const workerLimit = parseInt(document.getElementById('workerLimitProposta').value);
    const workerHours = parseFloat(document.getElementById('workerHoursProposta').value);
    const productionTime = parseFloat(document.getElementById('productionTimeProposta').value);
    const weeklyScale = parseInt(document.getElementById('weeklyScaleProposta').value);
    const nightShift = document.getElementById('nightShiftProposta').checked;
    
    // Validar valores
    if (isNaN(workerLimit) || workerLimit <= 0) {
        propostaError.textContent = 'Limite de trabalhadores deve ser um número maior que zero';
        propostaError.style.display = 'block';
        return;
    }
    
    if (isNaN(workerHours) || workerHours <= 0) {
        propostaError.textContent = 'Carga horária diária deve ser um número maior que zero';
        propostaError.style.display = 'block';
        return;
    }
    
    if (isNaN(productionTime) || productionTime <= 0) {
        propostaError.textContent = 'Tempo de produção deve ser um número maior que zero';
        propostaError.style.display = 'block';
        return;
    }
    
    if (isNaN(weeklyScale) || weeklyScale < 1 || weeklyScale > 7) {
        propostaError.textContent = 'Escala semanal deve ser um número entre 1 e 7';
        propostaError.style.display = 'block';
        return;
    }
    
    // Mostrar spinner durante o salvamento
    document.getElementById('propostaSpinner').style.display = 'inline-block';
    
    // Preparar dados para envio
    const proposalData = {
        instanceId: currentInstanceId,
        workerLimit: workerLimit,
        workerHours: workerHours,
        productionTime: productionTime,
        weeklyScale: weeklyScale,
        nightShift: nightShift
    };
    
    // Enviar para o servidor
    fetch('/api/workers-proposal', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(proposalData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Erro HTTP: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Atualizar dados em cache
        window.currentWorkersProposal = data;
        
        // Fechar modal
        closePropostaModal();
        
        // Mostrar mensagem de sucesso
        showSuccess('Proposta para trabalhadores salva com sucesso');
    })
    .catch(error => {
        console.error('Erro ao salvar proposta:', error);
        propostaError.textContent = 'Erro ao salvar: ' + error.message;
        propostaError.style.display = 'block';
    })
    .finally(() => {
        document.getElementById('propostaSpinner').style.display = 'none';
    });
}

/**
 * Salva as alterações na matriz e no vetor de demanda, bem como dados específicos para comitês.
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
        console.log("- Tipo de instância:", currentInstanceType);
        
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
            
            // Para comitês, só salvamos a primeira coluna, que representa o vetor tecnológico
            if (currentInstanceType === 'COMMITTEE') {
                const colId = productIds[0]; // ID da materialização do comitê
                const value = technologicalMatrix[i][0];
                
                // Só salvamos se o valor for maior que zero
                if (value > 0) {
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
            } else {
                // Para conselhos, salvamos a matriz completa
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
        
        // 6. Se for um comitê, adicione promessas para salvar dados específicos de comitê
        if (currentInstanceType === 'COMMITTEE') {
            // 6.1. Salvar dados de estoque e demanda
            const demandStockTable = document.getElementById('demandStockTable');
            if (demandStockTable) {
                const rows = demandStockTable.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const materializationId = parseInt(row.dataset.materializationId);
                    if (!materializationId) return;
                    
                    const stockInput = row.querySelector('.stock-input');
                    const demandInput = row.querySelector('.demand-input');
                    
                    if (stockInput && demandInput) {
                        const stock = parseFloat(stockInput.value) || 0;
                        const demand = parseFloat(demandInput.value) || 0;
                        
                        const demandStockPayload = {
                            instanceId: currentInstanceId,
                            materializationId: materializationId,
                            currentStock: stock,
                            demand: demand
                        };
                        
                        console.log(`Salvando estoque/demanda para materialização ${materializationId}:`, demandStockPayload);
                        
                        const demandStockPromise = fetch('/api/demand-stock', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(demandStockPayload)
                        });
                        
                        allPromises.push(demandStockPromise);
                    }
                });
            }
            
            // 6.2. Salvar quantidade produzida da instância
            const producedQuantityInput = document.getElementById('producedQuantity');
            if (producedQuantityInput) {
                const producedQuantity = parseFloat(producedQuantityInput.value) || 0;
                
                const instanceUpdatePayload = {
                    id: currentInstanceId,
                    producedQuantity: producedQuantity
                };
                
                console.log(`Atualizando quantidade produzida da instância:`, instanceUpdatePayload);
                
                const instanceUpdatePromise = fetch(`/api/instances/${currentInstanceId}/produced-quantity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(instanceUpdatePayload)
                });
                
                allPromises.push(instanceUpdatePromise);
            }
            
            // 6.3. Salvar proposta para trabalhadores (se existir)
            if (window.currentWorkersProposal) {
                const proposalData = {
                    instanceId: currentInstanceId,
                    workerLimit: window.currentWorkersProposal.workerLimit,
                    workerHours: window.currentWorkersProposal.workerHours,
                    productionTime: window.currentWorkersProposal.productionTime,
                    weeklyScale: window.currentWorkersProposal.weeklyScale,
                    nightShift: window.currentWorkersProposal.nightShift
                };
                
                console.log(`Salvando proposta para trabalhadores:`, proposalData);
                
                const proposalPromise = fetch('/api/workers-proposal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(proposalData)
                });
                
                allPromises.push(proposalPromise);
            }
        }
        
        // 7. Execute all promises
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