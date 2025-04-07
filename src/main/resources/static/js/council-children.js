/**
 * Funções para lidar com a exibição e operações de instâncias filhas
 */

/**
 * Carrega as instâncias filhas de um conselho e as exibe em um modal
 * @param {number} councilId - ID do conselho
 * @returns {Promise} - Promise que resolve quando as instâncias filhas são carregadas e exibidas
 */
function loadAndShowChildInstances(councilId) {
    // Criar e mostrar o modal primeiro
    const modal = createChildInstancesModal();
    showModal(modal);
    
    // Mostrar indicador de carregamento no modal
    const contentContainer = modal.querySelector('.modal-children-content');
    contentContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Carregando instâncias filhas...</p>
        </div>
    `;
    
    // Carregar as instâncias filhas do conselho
    return fetch(`/api/council/${councilId}/children`)
        .then(response => {
            if (!response.ok) {
                return handleHttpError(response);
            }
            return response.json();
        })
        .then(data => {
            // Atualizar o conteúdo do modal com as instâncias filhas
            displayChildInstances(contentContainer, data);
            return data; // Retornar os dados para uso posterior
        })
        .catch(error => {
            console.error('Erro ao carregar instâncias filhas:', error);
            contentContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar instâncias filhas: ${error.message}</p>
                </div>
            `;
            throw error;
        });
}

/**
 * Cria o modal para exibir as instâncias filhas
 * @returns {HTMLElement} - Elemento do modal
 */
function createChildInstancesModal() {
    // Verificar se o modal já existe
    let modal = document.getElementById('childInstancesModal');
    if (modal) {
        return modal;
    }
    
    // Criar o modal
    modal = document.createElement('div');
    modal.id = 'childInstancesModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Instâncias Filhas</h3>
                <span class="close" onclick="closeChildInstancesModal()">&times;</span>
            </div>
            <div class="modal-children-content"></div>
            <div class="modal-footer">
                <div class="calculation-status" id="modalCalculationStatus">
                    <span class="status-text">Aguardando...</span>
                    <div class="status-spinner"></div>
                </div>
                <button class="btn btn-secondary" onclick="closeChildInstancesModal()">Fechar</button>
                <button class="btn btn-primary" id="btnProceedCalculation" onclick="proceedCalculation()">Prosseguir</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

/**
 * Exibe o modal
 * @param {HTMLElement} modal - Elemento do modal a ser exibido
 */
function showModal(modal) {
    modal.style.display = 'block';
    
    // Adicionar animação de entrada
    setTimeout(() => {
        modal.querySelector('.modal-content').classList.add('show');
    }, 10);
}

/**
 * Fecha o modal de instâncias filhas
 */
function closeChildInstancesModal() {
    const modal = document.getElementById('childInstancesModal');
    if (modal) {
        modal.querySelector('.modal-content').classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Exibe as instâncias filhas no modal
 * @param {HTMLElement} container - Container onde exibir as instâncias
 * @param {Array} childInstances - Lista de instâncias filhas
 */
function displayChildInstances(container, childInstances) {
    if (!childInstances || childInstances.length === 0) {
        container.innerHTML = `
            <div class="info-message warning-message">
                <i class="fas fa-info-circle"></i>
                <p>Nenhuma instância filha encontrada para este conselho.</p>
                <p>É necessário ter pelo menos uma instância filha para calcular estimativas.</p>
            </div>
        `;
        // Desabilitar botão de prosseguir
        const btnProceed = document.getElementById('btnProceedCalculation');
        if (btnProceed) {
            btnProceed.disabled = true;
        }
        return;
    }
    
    // Criar tabela de instâncias
    let html = `
        <div class="info-message">
            <i class="fas fa-info-circle"></i>
            <p>Encontradas ${childInstances.length} instâncias filhas para este conselho.</p>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Adicionar cada instância à tabela
    childInstances.forEach(instance => {
        const instanceName = instance.name || `${getTypeName(instance.type)} #${instance.id}`;
        html += `
            <tr>
                <td>${instance.id}</td>
                <td>${instanceName}</td>
                <td>${getTypeName(instance.type)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Habilitar botão de prosseguir
    const btnProceed = document.getElementById('btnProceedCalculation');
    if (btnProceed) {
        btnProceed.disabled = false;
    }
}

/**
 * Obtém o nome amigável do tipo de instância
 * @param {string} type - Tipo da instância
 * @returns {string} - Nome amigável do tipo
 */
function getTypeName(type) {
    const typeNames = {
        'COMMITTEE': 'Comitê',
        'WORKER': 'Trabalhador',
        'COUNCIL': 'Conselho'
    };
    return typeNames[type] || type;
}

/**
 * Atualiza o status do cálculo no modal
 * @param {string} message - Mensagem de status
 * @param {string} status - Status (success, error, processing)
 */
function updateCalculationStatus(message, status = 'processing') {
    const statusElement = document.getElementById('modalCalculationStatus');
    if (!statusElement) return;
    
    const textElement = statusElement.querySelector('.status-text');
    const spinner = statusElement.querySelector('.status-spinner');
    
    // Limpar classes existentes
    statusElement.classList.remove('status-success', 'status-error', 'status-processing');
    
    // Atualizar texto
    if (textElement) {
        textElement.textContent = message;
    }
    
    // Adicionar classe apropriada
    statusElement.classList.add(`status-${status}`);
    
    // Mostrar/ocultar spinner
    if (spinner) {
        spinner.style.display = status === 'processing' ? 'block' : 'none';
    }
    
    // Desabilitar/habilitar botão de prosseguir
    const btnProceed = document.getElementById('btnProceedCalculation');
    if (btnProceed) {
        btnProceed.disabled = status === 'processing';
    }
}

/**
 * Procede com o cálculo após visualizar as instâncias filhas
 */
function proceedCalculation() {
    const instanceId = document.getElementById('instanceSelect').value;
    if (!instanceId) {
        showNotification('Selecione uma instância primeiro!', 'error');
        return;
    }
    
    // Atualizar status para processando
    updateCalculationStatus('Processando cálculo de estimativas...', 'processing');
    
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
        
        // Atualizar status para sucesso
        updateCalculationStatus('Estimativas calculadas com sucesso!', 'success');
        
        // Mostrar mensagem de sucesso
        showNotification('Estimativas calculadas com sucesso!', 'success');
        
        // Marcar que há alterações pendentes para salvar
        if (typeof pageState !== 'undefined') {
            pageState.isDirty = true;
        }
        
        // Fechar o modal após um pequeno delay
        setTimeout(() => {
            closeChildInstancesModal();
        }, 2000);
    })
    .catch(error => {
        console.error('Erro:', error);
        
        // Atualizar status para erro
        updateCalculationStatus(`Erro: ${error.message}`, 'error');
        
        // A notificação de erro já é mostrada pelo handleHttpError
    });
}
