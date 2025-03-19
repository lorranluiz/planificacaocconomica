// Script para controlar a página de planificação econômica

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar cabeçalho comum
    insertCommonHeader();

    // Variáveis para armazenar os dados da instância selecionada
    let currentInstanceId = null;
    let productNames = [];
    let productIds = [];
    let technologicalMatrix = [];
    let demandVector = [];
    
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
        
        // Adicionar linhas com valores
        demandVector.forEach((value, index) => {
            const tr = document.createElement('tr');
            
            // Adicionar nome do produto
            const tdName = document.createElement('td');
            tdName.textContent = productNames[index];
            tr.appendChild(tdName);
            
            // Adicionar valor de demanda
            const tdValue = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.value = value;
            input.dataset.index = index;
            input.addEventListener('change', function() {
                demandVector[index] = parseFloat(this.value) || 0;
            });
            tdValue.appendChild(input);
            tr.appendChild(tdValue);
            
            demandVectorTable.querySelector('tbody').appendChild(tr);
        });
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
        
        // Adicionar linhas com valores
        productionVector.forEach((value, index) => {
            const tr = document.createElement('tr');
            
            // Adicionar nome do produto
            const tdName = document.createElement('td');
            tdName.textContent = productNames[index];
            tr.appendChild(tdName);
            
            // Adicionar valor de produção
            const tdValue = document.createElement('td');
            tdValue.textContent = value.toFixed(2);
            tr.appendChild(tdValue);
            
            productionVectorTable.querySelector('tbody').appendChild(tr);
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
        // Implementação simples: alerta
        alert(message);
    }
});