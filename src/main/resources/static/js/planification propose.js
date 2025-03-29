// Script para controlar a página de planificação econômica

let selectedInstanceId = null;
let materializations = [];
let technologicalMatrix = [];
let technologicalMatrixProductNames = [];
let technologicalMatrixProductIds = [];
let demandVector = [];
let demandVectorProductNames = [];
let demandVectorProductIds = [];
let optimizationConfigs = [];
let currentOptimizationMaterializationId = null;

document.addEventListener('DOMContentLoaded', function() {
    fetchInstances();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('instanceSelect').addEventListener('change', function() {
        selectedInstanceId = this.value;
        if (selectedInstanceId) {
            // Usar o novo endpoint composto para buscar todos os dados de uma vez
            fetchPlanificationData(selectedInstanceId);
        } else {
            hideMatrixSection();
        }
    });

    document.getElementById('planifyButton').addEventListener('click', planify);
    document.getElementById('saveButton').addEventListener('click', saveChanges);
    document.getElementById('addMaterializationBtn').addEventListener('click', showNewMaterializationModal);
    
    // Setup para a modal de nova materialização
    document.getElementById('newMaterializationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewMaterialization();
    });
}

function fetchInstances() {
    fetch('/api/planification/instances')
        .then(response => response.json())
        .then(instances => {
            const select = document.getElementById('instanceSelect');
            select.innerHTML = '<option value="">Selecione uma instância...</option>';
            
            instances.forEach(instance => {
                const option = document.createElement('option');
                option.value = instance.id;
                option.textContent = instance.name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao buscar instâncias:', error);
            showError('Erro ao carregar instâncias. Por favor, tente novamente.');
        });
}

// Novo método para buscar todos os dados em uma única chamada
function fetchPlanificationData(instanceId) {
    showLoading();
    
    fetch(`/api/planification/instances/${instanceId}/full-data`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar dados da planificação');
            }
            return response.json();
        })
        .then(data => {
            // Armazenar dados recebidos nas variáveis globais
            materializations = data.materializations || [];
            
            // Dados da matriz tecnológica
            technologicalMatrix = data.technologicalMatrix?.matrix || [];
            technologicalMatrixProductNames = data.technologicalMatrix?.productNames || [];
            technologicalMatrixProductIds = data.technologicalMatrix?.productIds || [];
            
            // Dados do vetor de demanda
            demandVector = data.demandVector?.vector || [];
            demandVectorProductNames = data.demandVector?.productNames || [];
            demandVectorProductIds = data.demandVector?.productIds || [];
            
            // Configurações de otimização
            optimizationConfigs = data.optimizationConfigs || [];
            
            // Renderizar os dados
            renderTechnologicalMatrix();
            renderDemandVector();
            showMatrixSection();
            
            // Se existirem resultados anteriores, mostrar
            if (data.previousResults) {
                renderPlanificationResults(data.previousResults);
                showResults();
            } else {
                hideResults();
            }
            
            hideLoading();
        })
        .catch(error => {
            console.error('Erro ao buscar dados da planificação:', error);
            showError('Erro ao carregar dados. Por favor, tente novamente.');
            hideLoading();
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

// Função para mostrar a seção da matriz
function showMatrixSection() {
    document.getElementById('matrixSection').style.display = 'block';
}

// Função para esconder a seção da matriz
function hideMatrixSection() {
    document.getElementById('matrixSection').style.display = 'none';
}

// Função para mostrar resultados
function showResults() {
    document.getElementById('results').style.display = 'block';
}

// Função para esconder resultados
function hideResults() {
    document.getElementById('results').style.display = 'none';
}

// Função para mostrar o spinner de carregamento
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'inline-block';
}

// Função para esconder o spinner de carregamento
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// Função para renderizar a matriz tecnológica
function renderTechnologicalMatrix() {
    if (!technologicalMatrix || !technologicalMatrixProductNames) return;
    
    const technologicalMatrixTable = document.getElementById('technologicalMatrix');
    if (!technologicalMatrixTable) {
        console.error("Tabela de matriz tecnológica não encontrada");
        return;
    }
    
    // Limpar tabela
    technologicalMatrixTable.querySelector('thead tr').innerHTML = '<th></th>';
    technologicalMatrixTable.querySelector('tbody').innerHTML = '';
    
    // Adicionar cabeçalhos de colunas
    technologicalMatrixProductNames.forEach(name => {
        const th = document.createElement('th');
        th.textContent = name;
        technologicalMatrixTable.querySelector('thead tr').appendChild(th);
    });
    
    // Adicionar linhas com valores
    technologicalMatrix.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        // Adicionar nome do produto como primeira célula
        const headerCell = document.createElement('th');
        headerCell.textContent = technologicalMatrixProductNames[rowIndex];
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

// Função para renderizar o vetor de demanda
function renderDemandVector() {
    if (!demandVector || !demandVectorProductNames) return;
    
    const demandVectorTable = document.getElementById('demandVector');
    if (!demandVectorTable) {
        console.error("Tabela de vetor de demanda não encontrada");
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
    
    // Adicionar linhas com valores
    demandVector.forEach((value, index) => {
        const row = document.createElement('tr');
        row.dataset.materializationId = demandVectorProductIds[index];
        
        const displayName = demandVectorProductNames[index] || `Materialização #${demandVectorProductIds[index] || index+1}`;
        
        row.innerHTML = `
            <td>${displayName}</td>
            <td>
                <input type="number" step="0.01" min="0" value="${value}" 
                      onchange="updateDemandVector(${index}, this.value)" />
            </td>
            <td class="action-buttons">
                <button class="btn btn-sm" onclick="openOptimizationConfigModal(${index})">
                    <i class="fas fa-cogs"></i>
                </button>
                <button class="btn btn-sm remove-btn" onclick="removeMaterialization(${demandVectorProductIds[index]})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Função para atualizar valor do vetor de demanda
function updateDemandVector(index, value) {
    if (index >= 0 && index < demandVector.length) {
        demandVector[index] = parseFloat(value) || 0;
    }
}

// Função para salvar nova materialização
function saveNewMaterialization() {
    const name = document.getElementById('newMaterializationName').value.trim();
    const type = document.getElementById('newMaterializationType').value;
    const sectorId = document.getElementById('newMaterializationSector').value;
    
    if (!name || !type || !sectorId) {
        showError('Todos os campos são obrigatórios');
        return;
    }
    
    const data = {
        name: name,
        type: type,
        sectorId: parseInt(sectorId)
    };
    
    fetch('/api/social-materializations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao criar materialização');
        }
        return response.json();
    })
    .then(result => {
        showSuccess(`Materialização "${result.name}" criada com sucesso`);
        addMaterializationToTable(result);
    })
    .catch(error => {
        console.error('Erro ao criar materialização:', error);
        showError('Erro ao criar materialização. Por favor, tente novamente.');
    });
}

// Função para adicionar materialização à tabela
function addMaterializationToTable(materialization) {
    demandVectorProductIds.push(materialization.id);
    demandVectorProductNames.push(materialization.name);
    demandVector.push(0);
    
    const matrixRow = new Array(technologicalMatrix[0]?.length || 0).fill(0);
    technologicalMatrix.push(matrixRow);
    technologicalMatrix.forEach(row => row.push(0));
    
    renderTechnologicalMatrix();
    renderDemandVector();
}