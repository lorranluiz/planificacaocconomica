// Script para controlar a página de planificação econômica

// Definição do estado global da página
const pageState = {
    // Dados básicos do comitê
    id: null,
    committeeName: "",
    producedQuantity: 0,
    targetQuantity: 0,
    workerEffectiveLimit: 0,
    socialMaterializationId: null,
    councilId: null,

    // Proposta de trabalhadores
    workerProposal: {
        workerLimit: 0,
        workerHours: 0,
        productionTime: 0,
        nightShift: false,
        weeklyScale: 5
    },

    // Membros do comitê 
    members: [],

    // Materializações relacionadas
    materializations: [],

    // Flags de controle
    initialized: false,
    isDirty: false
};

// Adicionar ao estado global no topo do arquivo (após declaração do pageState)
const globalState = {
    // Lista completa de todas as materializações disponíveis
    allMaterializations: [],
    // Flag para controlar se já carregamos todas as materializações do servidor
    materializationsLoaded: false,
    // Flag para controlar se o dropdown está visível
    dropdownVisible: false,
    // Flag para controlar se estamos carregando dados
    loadingMaterializations: false
};

// Cache de dados em memória para reduzir chamadas ao servidor
const localCache = {
    data: {},
    timeouts: {},
    
    // Define um item no cache com tempo de expiração
    set: function(key, value, expirationMs = 60000) { // 1 minuto padrão
        this.data[key] = {
            value: value,
            timestamp: Date.now()
        };
        
        // Limpar timeout anterior se existir
        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
        }
        
        // Configurar timeout para expiração automática
        this.timeouts[key] = setTimeout(() => {
            delete this.data[key];
            delete this.timeouts[key];
        }, expirationMs);
    },
    
    // Recupera um item do cache
    get: function(key) {
        const item = this.data[key];
        if (!item) return null;
        return item.value;
    },
    
    // Verifica se um item está no cache e não expirou
    has: function(key) {
        return this.data.hasOwnProperty(key);
    },
    
    // Remove um item do cache
    remove: function(key) {
        delete this.data[key];
        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
            delete this.timeouts[key];
        }
    },
    
    // Limpa o cache por completo
    clear: function() {
        this.data = {};
        for (const key in this.timeouts) {
            clearTimeout(this.timeouts[key]);
        }
        this.timeouts = {};
    }
};

// Funções auxiliares para manipulação de números com diferentes separadores decimais
function formatNumberForDisplay(value) {
    if (value === null || value === undefined || isNaN(parseFloat(value))) return "0";
    return parseFloat(value).toString().replace('.', ',');
}

// Improved function for parsing decimal input to ensure proper conversion
function parseDecimalInput(value) {
    if (!value) return 0;
    
    // Normalize the input: replace comma with period for proper numeric conversion
    const normalizedValue = value.toString().replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    
    // Additional validation to ensure we get a proper number
    if (isNaN(parsed)) {
        console.warn("Input value could not be parsed as a number:", value);
        return 0;
    }
    
    return parsed;
}

// Configurar event listeners quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Carregar instâncias para o select
    loadInstanceSelect();
    
    // Event listener para seleção de instância
    const instanceSelect = document.getElementById('instanceSelect');
    if (instanceSelect) {
        instanceSelect.addEventListener('change', function() {
            const committeeId = this.value;
            if (committeeId) {
                // Mostrar seção da matriz
                document.getElementById('matrixSection').style.display = 'block';
                
                // Inicializar o estado com os dados do comitê selecionado
                initializePageState(committeeId);
            } else {
                // Ocultar seção da matriz
                document.getElementById('matrixSection').style.display = 'none';
                
                // Resetar estado
                resetPageState();
            }
        });
    }
    
    // Event listener para o botão salvar
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveCommitteeState);
    }
    
    // Event listener para o botão de adicionar materialização
    const addStockDemandBtn = document.getElementById('addStockDemandBtn');
    if (addStockDemandBtn) {
        addStockDemandBtn.addEventListener('click', function(event) {
            openMaterializationSelect(event);
        });
    }
    
    // Event listener para o botão de proposta
    const openPropostaBtn = document.getElementById('openPropostaBtn');
    if (openPropostaBtn) {
        openPropostaBtn.addEventListener('click', openPropostaModal);
    }
    
    // Verificar se há ID na URL para carregamento direto
    const urlParams = new URLSearchParams(window.location.search);
    const committeeId = urlParams.get('id');
    if (committeeId) {
        // Selecionar no dropdown
        if (instanceSelect) {
            instanceSelect.value = committeeId;
            // Disparar evento de change para carregar os dados
            const event = new Event('change');
            instanceSelect.dispatchEvent(event);
        } else {
            // Se o dropdown não foi carregado ainda, inicializar diretamente
            document.getElementById('matrixSection').style.display = 'block';
            initializePageState(committeeId);
        }
    }
    
    // Configurar verificação antes de sair da página com alterações não salvas
    window.addEventListener('beforeunload', function(e) {
        if (pageState.isDirty) {
            const message = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
            e.returnValue = message;
            return message;
        }
    });
});

// Funções para carregar dados

function loadInstanceSelect() {
    const select = document.getElementById('instanceSelect');
    if (!select) return;
    
    fetch('/api/instances/committees')
        .then(response => response.json())
        .then(committees => {
            committees.forEach(committee => {
                const option = document.createElement('option');
                option.value = committee.id;
                option.textContent = committee.name;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar comitês:', error));
}

/**
 * Carrega todas as materializações sociais disponíveis do servidor
 * e armazena no estado global
 */
function loadAllMaterializations() {
    // Evitar múltiplas chamadas simultâneas
    if (globalState.loadingMaterializations) {
        return Promise.resolve(globalState.allMaterializations || []);
    }
    
    globalState.loadingMaterializations = true;
    
    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Adicionar um timestamp para evitar cache do navegador
    const timestamp = new Date().getTime();
    
    return fetch(`/api/planification/available-materializations?_t=${timestamp}`, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar materializações sociais');
        }
        return response.json();
    })
    .then(materializations => {
        globalState.allMaterializations = materializations;
        globalState.materializationsLoaded = true;
        console.log(`Carregadas ${materializations.length} materializações sociais do servidor`);
        return materializations;
    })
    .catch(error => {
        console.error('Erro ao carregar lista de materializações:', error);
        showErrorMessage('Erro ao carregar materializações. Por favor, tente novamente.');
        return [];
    })
    .finally(() => {
        globalState.loadingMaterializations = false;
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    });
}

/**
 * Abre o modal de seleção de materialização para adicionar
 * à matriz tecnológica ou tabela de estoque/demanda
 */
function openMaterializationSelect(event) {
    // Evitar a propagação do evento para não fechar o dropdown imediatamente
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Não abrir se já estiver aberto ou se estiver carregando
    if (globalState.dropdownVisible || globalState.loadingMaterializations) {
        console.log("Dropdown já está aberto ou carregando, ignorando clique");
        return;
    }

    if (!pageState.id) {
        showErrorMessage("Selecione um comitê primeiro");
        return;
    }
    
    // Marcar como em processo de abertura
    globalState.dropdownVisible = true;
    
    // Remover dropdown existente para garantir que não haja duplicatas
    removeExistingDropdown();
    
    // Forçar recarregamento da lista de materializações disponíveis
    // para evitar problemas com materializações recentemente excluídas
    globalState.materializationsLoaded = false;
    globalState.allMaterializations = [];
    
    // Função para mostrar o dropdown com as materializações filtradas
    const showDropdownWithMaterializations = (allMaterializations) => {
        // Se não temos materializações ou o array está vazio, mostrar mensagem
        if (!allMaterializations || allMaterializations.length === 0) {
            // Criar dropdown com mensagem de "sem materializações"
            showMaterializationDropdown([]);
            return;
        }
        
        // Obter IDs das materializações atuais (não deletadas)
        const existingIds = pageState.materializations
            .filter(m => !m.isDeleted) // Considerar apenas as não excluídas
            .map(m => m.id);
        
        // Filtrar materializações que não estão na tabela ou que foram excluídas
        const availableMaterializations = allMaterializations.filter(
            m => !existingIds.includes(m.id) && m.id !== pageState.socialMaterializationId
        );
        
        console.log(`Mostrando dropdown com ${availableMaterializations.length} materializações disponíveis`);
        
        // Criar dropdown para seleção
        showMaterializationDropdown(availableMaterializations);
    };
    
    // Sempre carregar uma nova lista fresca de materializações sociais
    // Adicionando um timestamp para evitar cache
    const timestamp = new Date().getTime();
    loadAllMaterializations()
        .then(materializations => {
            showDropdownWithMaterializations(materializations);
        });
}

/**
 * Remove qualquer dropdown existente para evitar duplicatas
 */
function removeExistingDropdown() {
    const existingDropdown = document.querySelector('.materialization-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        console.log("Dropdown existente removido");
    }
}

/**
 * Exibe o dropdown de seleção de materializações
 */
function showMaterializationDropdown(materializations) {
    // Remover dropdown existente novamente para garantir
    removeExistingDropdown();
    
    // Criar elemento de dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'materialization-dropdown';
    
    // Posicionar dropdown adequadamente baseado no botão clicado
    const button = document.getElementById('addStockDemandBtn');
    if (!button) {
        console.error("Botão de adicionar não encontrado");
        globalState.dropdownVisible = false;
        return;
    }

    const buttonRect = button.getBoundingClientRect();
    
    // Garantir que estamos posicionando corretamente, usando valores absolutos
    dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
    dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
    dropdown.style.minWidth = `${Math.max(buttonRect.width * 2, 200)}px`;
    
    // Adicionar itens ao dropdown
    if (!materializations || materializations.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'Nenhuma materialização disponível';
        dropdown.appendChild(emptyMessage);
    } else {
        materializations.forEach(mat => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = mat.name || `Materialização #${mat.id}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                addMaterialization(mat);
                closeDropdown(dropdown);
            });
            dropdown.appendChild(item);
        });
    }
    
    // Adicionar opção para criar nova materialização
    const newItem = document.createElement('div');
    newItem.className = 'dropdown-item add-new-item';
    newItem.textContent = '+ Nova Materialização Social';
    newItem.addEventListener('click', (e) => {
        e.stopPropagation();
        openNewMaterializationModal();
        closeDropdown(dropdown);
    });
    dropdown.appendChild(newItem);
    
    // Adicionar ao documento
    document.body.appendChild(dropdown);
    
    console.log("Dropdown criado e adicionado ao DOM");
    
    // Fechar dropdown quando clicar fora dele
    function handleDocumentClick(e) {
        if (!dropdown.contains(e.target) && e.target !== button) {
            closeDropdown(dropdown);
        }
    }
    
    // Adicionar evento de clique ao documento após um pequeno delay
    // para evitar que o dropdown seja fechado imediatamente
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClick);
    }, 100);
    
    // Função para fechar o dropdown e limpar eventos
    function closeDropdown(dropdownElement) {
        document.removeEventListener('click', handleDocumentClick);
        if (dropdownElement && dropdownElement.parentNode) {
            dropdownElement.remove();
        }
        globalState.dropdownVisible = false;
        console.log("Dropdown fechado");
    }
}

/**
 * Inicializa o estado da página com os dados do comitê - versão otimizada
 * que utiliza a nova API para obter todo o estado em uma única chamada
 * 
 * @param {number} committeeId ID do comitê a ser carregado
 */
function initializePageState(committeeId) {
    if (!committeeId) return;
    
    // Resetar estado
    resetPageState();
    pageState.id = committeeId;

    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Verificar se temos os dados em cache
    const cacheKey = `committee_state_${committeeId}`;
    if (localCache.has(cacheKey)) {
        const cachedState = localCache.get(cacheKey);
        
        // Atualizar o estado com dados do cache
        Object.assign(pageState, cachedState);
        
        // Atualizar a interface com os dados carregados
        updateAllUI();
        
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        console.log("Dados carregados do cache local");
        
        // Marcar como inicializado
        pageState.initialized = true;
        return;
    }
    
    // Se não temos em cache, buscar do servidor usando a nova API otimizada
    fetch(`/api/committees/${committeeId}/state`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar estado do comitê');
            }
            return response.json();
        })
        .then(data => {
            // Atualizar o estado com os dados recebidos
            pageState.id = data.id;
            pageState.committeeName = data.committeeName || "";
            pageState.producedQuantity = data.producedQuantity || 0;
            pageState.targetQuantity = data.targetQuantity || 0;
            pageState.workerEffectiveLimit = data.workerEffectiveLimit || 0;
            pageState.socialMaterializationId = data.socialMaterializationId;
            pageState.councilId = data.councilId;
            pageState.workerProposal = data.workerProposal || {
                workerLimit: 0,
                workerHours: 0,
                productionTime: 0,
                nightShift: false,
                weeklyScale: 5
            };
            pageState.members = data.members || [];
            pageState.materializations = data.materializations || [];
            
            // Armazenar em cache local
            localCache.set(cacheKey, {
                id: pageState.id,
                committeeName: pageState.committeeName,
                producedQuantity: pageState.producedQuantity,
                targetQuantity: pageState.targetQuantity,
                workerEffectiveLimit: pageState.workerEffectiveLimit,
                socialMaterializationId: pageState.socialMaterializationId,
                councilId: pageState.councilId,
                workerProposal: pageState.workerProposal,
                members: pageState.members,
                materializations: pageState.materializations
            }, 300000); // 5 minutos de cache
            
            // Atualizar a interface com os dados carregados
            updateAllUI();
            
            // Ocultar indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            // Marcar como inicializado
            pageState.initialized = true;
            console.log("Dados carregados do servidor e armazenados em cache");
        })
        .catch(error => {
            console.error('Erro ao carregar estado do comitê:', error);
            showErrorMessage('Erro ao carregar dados do comitê. Por favor, tente novamente.');
            
            // Ocultar indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        });
}

/**
 * Reseta o estado da página para os valores iniciais
 */
function resetPageState() {
    pageState.id = null;
    pageState.committeeName = "";
    pageState.producedQuantity = 0;
    pageState.targetQuantity = 0;
    pageState.workerEffectiveLimit = 0;
    pageState.socialMaterializationId = null;
    pageState.councilId = null;
    
    pageState.workerProposal = {
        workerLimit: 0,
        workerHours: 0,
        productionTime: 0,
        nightShift: false,
        weeklyScale: 5
    };
    
    pageState.members = [];
    pageState.materializations = [];
    
    pageState.initialized = false;
    pageState.isDirty = false;
}

/**
 * Atualiza toda a interface com base no estado atual
 */
function updateAllUI() {
    updateBasicDataUI();
    updateWorkerProposalUI();
    updateMembersUI();
    updateMaterializationsUI();
}

/**
 * Atualiza a interface com os dados básicos do comitê
 */
function updateBasicDataUI() {
    // Em vez de retornar imediatamente, vamos fazer um log e continuar
    // tentando processar o que for possível com os dados disponíveis
    if (!pageState.initialized) {
        console.log("Aviso: Tentativa de atualizar UI com dados não inicializados");
        // Continuamos a execução mesmo sem inicialização completa
    }
    
    // Atualizar nome do comitê se disponível
    if (pageState.committeeName) {
        document.title = `Comitê: ${pageState.committeeName}`;
    } else {
        document.title = "Comitê";
    }
    
    // Preencher campos da tabela de produção e meta com verificação de existência
    const producedQuantityInput = document.getElementById('producedQuantity');
    const remainingQuantityCell = document.getElementById('remainingQuantity');
    const productNameTargetSection = document.getElementById('productNameTargetSection');
    const productNameTechnologicalVector = document.getElementById('productNameTechnologicalVector');
    
    // Verificar se os elementos foram encontrados e registrar no console
    console.log('Elementos da UI encontrados:', {
        producedQuantityInput: !!producedQuantityInput,
        remainingQuantityCell: !!remainingQuantityCell,
        productNameTargetSection: !!productNameTargetSection,
        productNameTechnologicalVector: !!productNameTechnologicalVector
    });
    
    // Continuar com atualizações seguras, validando a existência dos elementos
    if (producedQuantityInput) {
        producedQuantityInput.value = formatNumberForDisplay(pageState.producedQuantity);
        
        // Adicionar evento para atualizar quando o valor mudar
        producedQuantityInput.onchange = function() {
            pageState.producedQuantity = parseDecimalInput(this.value);
            pageState.isDirty = true;
            
            // Atualizar o valor exibido de quantidade restante
            if (remainingQuantityCell) {
                const remaining = (pageState.targetQuantity || 0) - (pageState.producedQuantity || 0);
                remainingQuantityCell.textContent = formatNumberForDisplay(remaining);
                remainingQuantityCell.classList.toggle('remaining-positive', remaining > 0);
            }
        };
    }
    
    // Atualizar quantidade restante
    if (remainingQuantityCell) {
        const remaining = (pageState.targetQuantity || 0) - (pageState.producedQuantity || 0);
        remainingQuantityCell.textContent = formatNumberForDisplay(remaining);
        remainingQuantityCell.classList.toggle('remaining-positive', remaining > 0);
    }
    
    // Atualizar nome do produto nas seções correspondentes
    if (pageState.socialMaterializationId && pageState.materializations) {
        // Buscar a materialização social associada ao comitê
        const socialMaterialization = pageState.materializations.find(
            m => m.id === pageState.socialMaterializationId
        );
        
        if (socialMaterialization) {
            const name = socialMaterialization.name || `Materialização #${socialMaterialization.id}`;
            
            // Atualizar os elementos com o nome do produto
            if (productNameTargetSection) {
                productNameTargetSection.textContent = name;
            }
            
            if (productNameTechnologicalVector) {
                productNameTechnologicalVector.textContent = name;
            }
            
            // Log para depuração
            console.log(`Nome do produto atualizado para: ${name}`);
        } else {
            console.warn(`Materialização com ID ${pageState.socialMaterializationId} não encontrada no array de materializações`);
        }
    } else {
        console.info("Não foi possível atualizar o nome do produto: ID de materialização ou array de materializações não definidos");
    }
    
    // Exibir o botão de proposta se o elemento existe
    const committeeControls = document.getElementById('committeeControls');
    if (committeeControls) {
        committeeControls.style.display = 'flex';
        console.log("Controles do comitê configurados para display: flex");
    }
    
    // Adicionar estilo para quantidade restante se não existir
    if (!document.querySelector('style#remaining-style')) {
        const style = document.createElement('style');
        style.id = 'remaining-style';
        style.textContent = `
            .remaining-positive {
                font-weight: bold;
                color: var(--warning-color, #fd7e14);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Atualiza a interface com os dados da proposta de trabalhadores
 */
function updateWorkerProposalUI() {
    // Só precisamos atualizar quando o modal de proposta for aberto
    // Isso é feito na função openPropostaModal
}

/**
 * Atualiza a interface com os membros do comitê
 */
function updateMembersUI() {
    // A funcionalidade de exibir membros não está presente na interface HTML atual
    // Esta função será implementada quando a interface para isso for adicionada
}

/**
 * Atualiza a interface com as materializações sociais associadas ao comitê
 */
function updateMaterializationsUI() {
    // 1. Atualizar tabela de estoque e demanda
    updateDemandStockTable();
    
    // 2. Atualizar matriz tecnológica
    updateTechnologicalMatrixTable();
}

/**
 * Atualiza a tabela de estoque e demanda com base no estado atual
 */
function updateDemandStockTable() {
    const table = document.getElementById('demandStockTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Limpar tabela atual
    tbody.innerHTML = '';
    
    // Se não há materializações, mostrar mensagem
    if (!pageState.materializations || pageState.materializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Não há dados de estoque/demanda disponíveis</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Determinar qual é a materialização de saída (produto do comitê)
    const outputMaterializationId = pageState.socialMaterializationId;
    
    // Filtrar materializações - incluir todas exceto as excluídas
    const filteredMaterializations = pageState.materializations.filter(mat => {
        // Pular materializações excluídas
        if (mat.isDeleted === true) return false;
        
        return true;
    });
    
    // Se não há materializações filtradas, mostrar mensagem
    if (filteredMaterializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Não há dados de estoque/demanda para as materializações associadas</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Renderizar cada materialização filtrada
    filteredMaterializations.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.materializationId = item.id;
        
        // Verificar se é a materialização principal do comitê
        const isMainProduct = (item.id === outputMaterializationId);
        
        // Adicionar classe especial se for o produto principal
        if (isMainProduct) {
            tr.classList.add('main-product-row');
        }
        
        // Calcular o saldo (estoque - demanda)
        const stock = parseDecimalInput(item.stock) || 0;
        const demand = parseDecimalInput(item.demand) || 0;
        const balance = stock - demand;
        
        // Construir o HTML da linha
        let rowHTML = `
            <td>${isMainProduct ? 
                `<strong>${item.name || 'Não especificado'}</strong> 
                <span class="badge main-product-badge" title="Materialização social da unidade produtiva gerida por esse comitê">
                  <i class="fas fa-industry"></i>
                </span>` 
                : item.name || 'Não especificado'}</td>
            <td>
                <input type="text" class="form-control stock-input" 
                    value="${formatNumberForDisplay(stock)}" 
                    data-id="${item.id}"
                    onchange="updateStockValue(${item.id}, this.value)">
            </td>
            <td>
                <input type="text" class="form-control demand-input" 
                    value="${formatNumberForDisplay(demand)}" 
                    data-id="${item.id}"
                    onchange="updateDemandValue(${item.id}, this.value)">
            </td>
            <td class="balance-cell ${balance < 0 ? 'negative' : ''}">${formatNumberForDisplay(balance)}</td>
            <td>
                <div class="action-buttons">
        `;
        
        // Adicionar botão de remoção apenas se não for o produto principal
        if (!isMainProduct) {
            rowHTML += `
                    <button class="action-btn remove-btn" onclick="removeMaterialization(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
            `;
        }
        
        rowHTML += `
                </div>
            </td>
        `;
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    // Adicionar estilos para células de saldo negativo e produto principal
    if (!document.querySelector('style#balance-and-product-style')) {
        const style = document.createElement('style');
        style.id = 'balance-and-product-style';
        style.textContent = `
            .balance-cell.negative {
                color: var(--danger-color, #dc3545);
                font-weight: bold;
            }
            
            .main-product-row {
                background-color: rgba(var(--primary-rgb, 33, 150, 243), 0.1);
            }
            
            .main-product-badge {
                background-color: var(--primary-color, #2196f3);
                color: white !important;
                padding: 5px 6px;
                border-radius: 50%;
                font-size: 0.8em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                margin-left: 8px;
                cursor: help;
                transition: transform 0.2s ease;
            }

            .main-product-badge:hover {
                transform: scale(1.15);
            }
            
            /* Garantir texto branco para todos os temas escuros */
            [data-theme="night"] .main-product-badge,
            [data-theme="ocean"] .main-product-badge,
            [data-theme="bolchevick"] .main-product-badge {
                color: white !important;
            }
            
            [data-theme="night"] .main-product-badge {
                background-color: var(--primary-color, #c62828);
            }
            
            [data-theme="night"] .main-product-row {
                background-color: rgba(198, 40, 40, 0.1);
            }
            
            /* Estilos específicos para tema Ocean */
            [data-theme="ocean"] .main-product-badge {
                background-color: var(--primary-color, #2196f3);
            }
            
            /* Estilos específicos para tema Bolchevick */
            [data-theme="bolchevick"] .main-product-badge {
                background-color: var(--primary-color, #c62828);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Atualiza a tabela da matriz tecnológica com base no estado atual
 */
function updateTechnologicalMatrixTable() {
    const table = document.getElementById('technologicalMatrix');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Limpar tabela atual
    tbody.innerHTML = '';
    
    // Se não há produtos ou materializações, mostrar mensagem
    if (!pageState.materializations || pageState.materializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center">Não há dados de coeficientes disponíveis</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Determinar qual é a materialização de saída (produto do comitê)
    const outputMaterializationId = pageState.socialMaterializationId;
    
    // Se não temos um produto definido, mostrar mensagem
    if (!outputMaterializationId) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center">Produto do comitê não definido</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Filtrar materializações que não estão excluídas
    const inputMaterializations = pageState.materializations.filter(mat => {
        // Pular materializações excluídas
        if (mat.isDeleted === true) return false;
        
        return true;
    });
    
    // Se não há insumos, mostrar mensagem
    if (inputMaterializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center">Não há insumos definidos para este produto</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Renderizar cada insumo
    inputMaterializations.forEach(mat => {
        const tr = document.createElement('tr');
        tr.dataset.materializationId = mat.id;
        
        // Verificar se é o produto próprio do comitê
        const isMainProduct = (mat.id === outputMaterializationId);
        
        // Adicionar classe especial se for o produto principal
        if (isMainProduct) {
            tr.classList.add('main-product-row');
        }
        
        // Obter coeficiente deste insumo para o produto do comitê
        const tensors = mat.technologicalTensors || {};
        const coeff = tensors[outputMaterializationId] || 0;
        
        // Modificado: tornar o coeficiente editável mesmo para o produto principal
        // e usar o valor padrão de 0 em vez de fixar em 1,0
        if (isMainProduct) {
            tr.innerHTML = `
                <td><strong>${mat.name || `Produto #${mat.id}`}</strong> 
                <span class="badge main-product-badge" title="Materialização social da unidade produtiva gerida por esse comitê">
                  <i class="fas fa-industry"></i>
                </span></td>
                <td>
                    <input type="text" class="form-control coefficient-input" 
                           value="${formatNumberForDisplay(coeff)}" 
                           data-input-id="${mat.id}" 
                           data-output-id="${outputMaterializationId}" 
                           onchange="updateTensorCoefficient(${mat.id}, ${outputMaterializationId}, this)">
                </td>
                <td><!-- Espaço para ações (vazio para o produto principal) --></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${mat.name || `Insumo #${mat.id}`}</td>
                <td>
                    <input type="text" class="form-control coefficient-input" 
                           value="${formatNumberForDisplay(coeff)}" 
                           data-input-id="${mat.id}" 
                           data-output-id="${outputMaterializationId}" 
                           onchange="updateTensorCoefficient(${mat.id}, ${outputMaterializationId}, this)">
                </td>
                <td><!-- Aqui poderia ter uma lixeira usando mat.id, mas foi removida para ficar mais clean --></td>
            `;
        }
        
        tbody.appendChild(tr);
    });
}

/**
 * Salva o estado do comitê e limpa o cache local após salvamento
 */
function saveCommitteeState() {
    // Atualizar o estado com os valores atuais dos inputs
    updateStateFromUI();
    
    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Desabilitar botão de salvamento
    const saveButton = document.getElementById('saveButton');
    if (saveButton) saveButton.disabled = true;
    
    // Preparar os dados para envio - Não filtrar materializações marcadas como excluídas
    const committeeData = {
        id: pageState.id,
        committeeName: pageState.committeeName,
        producedQuantity: pageState.producedQuantity,
        targetQuantity: pageState.targetQuantity,
        workerEffectiveLimit: pageState.workerEffectiveLimit,
        socialMaterializationId: pageState.socialMaterializationId,
        councilId: pageState.councilId,
        workerProposal: pageState.workerProposal,
        members: pageState.members,
        // Certifique-se de que TODAS as materializações são enviadas, incluindo as com isDeleted: true
        materializations: pageState.materializations
    };
    
    // Salvar IDs de materializações que serão excluídas para atualizarmos a UI depois
    const deletedMaterializationIds = pageState.materializations
        .filter(m => m.isDeleted === true)
        .map(m => m.id);
    
    console.log(`Salvando ${pageState.materializations.length} materializações, ${deletedMaterializationIds.length} marcadas para exclusão`);
    
    // Enviar a requisição
    fetch('/api/committees/save-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(committeeData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar dados do comitê');
        }
        return response.json();
    })
    .then(data => {
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        // Reabilitar botão de salvamento
        if (saveButton) saveButton.disabled = false;
        
        // Mostrar mensagem de sucesso
        showSuccessMessage('Dados salvos com sucesso!');
        
        // Resetar flag de alterações pendentes
        pageState.isDirty = false;
        
        // Atualizar o ID do comitê se for novo
        if (data.committeeId && !pageState.id) {
            pageState.id = data.committeeId;
            
            // Atualizar URL se necessário
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('id', data.committeeId);
            window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
        }
        
        // Importante: Limpar o cache local para forçar uma atualização na próxima carga
        // pois os dados no servidor foram alterados
        if (pageState.id) {
            localCache.remove(`committee_state_${pageState.id}`);
        }
        
        // Importante: Limpar os dados de materializações marcadas para exclusão
        // após serem removidas do banco de dados
        if (deletedMaterializationIds.length > 0) {
            console.log(`Removendo ${deletedMaterializationIds.length} materializações excluídas do estado local`);
            
            // Remover materializações excluídas do array atual
            pageState.materializations = pageState.materializations.filter(m => !m.isDeleted);
            
            // Limpar completamente o cache global de materializações para forçar recarregamento
            globalState.materializationsLoaded = false;
            globalState.allMaterializations = [];
            
            // Recarregar a lista de materializações disponíveis para atualizar o dropdown
            // com um pequeno atraso para garantir que o servidor concluiu a exclusão
            setTimeout(() => {
                loadAllMaterializations().then(() => {
                    console.log("Lista de materializações recarregada após exclusão");
                });
            }, 500);
            
            // Atualizar interface para refletir as exclusões
            updateMaterializationsUI();
        }
    })
    .catch(error => {
        console.error('Erro ao salvar comitê:', error);
        
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        // Reabilitar botão de salvamento
        if (saveButton) saveButton.disabled = false;
        
        // Mostrar mensagem de erro
        showErrorMessage('Erro ao salvar os dados. Por favor, tente novamente.');
    });
}

/**
 * Atualiza o estado com os valores atuais da interface
 */
function updateStateFromUI() {
    // Atualizar quantidade produzida
    const producedQuantityInput = document.getElementById('producedQuantity');
    if (producedQuantityInput) {
        pageState.producedQuantity = parseFloat(producedQuantityInput.value) || 0;
    }
    
    // Explicitamente atualizar valores de estoque e demanda de todas as materializações visíveis na tabela
    const stockInputs = document.querySelectorAll('.stock-input');
    const demandInputs = document.querySelectorAll('.demand-input');
    
    stockInputs.forEach(input => {
        const materializationId = parseInt(input.dataset.id);
        if (materializationId) {
            const materialization = pageState.materializations.find(m => m.id === materializationId);
            if (materialization) {
                materialization.stock = parseDecimalInput(input.value);
            }
        }
    });
    
    demandInputs.forEach(input => {
        const materializationId = parseInt(input.dataset.id);
        if (materializationId) {
            const materialization = pageState.materializations.find(m => m.id === materializationId);
            if (materialization) {
                materialization.demand = parseDecimalInput(input.value);
            }
        }
    });
    
    // Verificar se há entradas com coeficientes que precisam ser atualizadas
    const coefficientInputs = document.querySelectorAll('.coefficient-input');
    coefficientInputs.forEach(input => {
        const inputId = parseInt(input.dataset.inputId);
        const outputId = parseInt(input.dataset.outputId);
        if (inputId && outputId) {
            const inputMat = pageState.materializations.find(m => m.id === inputId);
            if (inputMat) {
                if (!inputMat.technologicalTensors) {
                    inputMat.technologicalTensors = {};
                }
                inputMat.technologicalTensors[outputId] = parseDecimalInput(input.value);
            }
        }
    });
}

/**
 * Mostra uma mensagem de sucesso temporária
 */
function showSuccessMessage(message) {
    // Implementar lógica para mostrar mensagem de sucesso
    alert(message); // Placeholder simples
}

/**
 * Mostra uma mensagem de erro temporária
 */
function showErrorMessage(message) {
    // Implementar lógica para mostrar mensagem de erro
    alert(message); // Placeholder simples
}

// Funções para abrir modais

function openPropostaModal() {
    // Configurar campos do modal com dados atuais
    document.getElementById('unitName').textContent = pageState.committeeName || "---";
    document.getElementById('workerLimitProposta').value = pageState.workerProposal.workerLimit || 0;
    document.getElementById('workerHoursProposta').value = pageState.workerProposal.workerHours || 0;
    document.getElementById('productionTimeProposta').value = pageState.workerProposal.productionTime || 0;
    document.getElementById('weeklyScaleProposta').value = pageState.workerProposal.weeklyScale || 5;
    document.getElementById('nightShiftProposta').checked = pageState.workerProposal.nightShift || false;
    
    // Exibir o modal
    document.getElementById('propostaModal').style.display = 'flex';
}

function closePropostaModal() {
    document.getElementById('propostaModal').style.display = 'none';
}

function savePropostaInputs() {
    // Validar campos
    const workerLimit = parseInt(document.getElementById('workerLimitProposta').value);
    const workerHours = parseFloat(document.getElementById('workerHoursProposta').value);
    const productionTime = parseFloat(document.getElementById('productionTimeProposta').value);
    const weeklyScale = parseInt(document.getElementById('weeklyScaleProposta').value);
    const nightShift = document.getElementById('nightShiftProposta').checked;
    
    // Validações básicas
    if (isNaN(workerLimit) || workerLimit <= 0 ||
        isNaN(workerHours) || workerHours <= 0 ||
        isNaN(productionTime) || productionTime <= 0 ||
        isNaN(weeklyScale) || weeklyScale < 1 || weeklyScale > 7) {
        
        document.getElementById('propostaError').textContent = 'Todos os campos são obrigatórios e devem conter valores válidos.';
        document.getElementById('propostaError').style.display = 'block';
        return;
    }
    
    // Atualizar estado com os valores do formulário
    pageState.workerProposal = {
        workerLimit,
        workerHours,
        productionTime,
        nightShift,
        weeklyScale
    };
    
    pageState.isDirty = true;
    
    // Fechar modal
    closePropostaModal();
    
    // Mostrar mensagem de sucesso
    showSuccessMessage('Proposta atualizada com sucesso. Clique em "Salvar Alterações" para salvar as mudanças.');
}

/**
 * Atualiza o valor de estoque de uma materialização
 */
function updateStockValue(materializationId, value) {
    const stockValue = parseDecimalInput(value);
    
    // Buscar a materialização no estado
    const materialization = pageState.materializations.find(m => m.id === materializationId);
    if (!materialization) return;
    
    // Atualizar valor
    materialization.stock = stockValue;
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Atualiza o valor de demanda de uma materialização
 */
function updateDemandValue(materializationId, value) {
    const demandValue = parseDecimalInput(value);
    
    // Buscar a materialização no estado
    const materialization = pageState.materializations.find(m => m.id === materializationId);
    if (!materialization) return;
    
    // Atualizar valor
    materialization.demand = demandValue;
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Atualiza a célula de saldo para uma materialização
 */
function updateBalanceCell(materializationId) {
    const row = document.querySelector(`tr[data-materialization-id="${materializationId}"]`);
    if (!row) return;
    
    const stockInput = row.querySelector('.stock-input');
    const demandInput = row.querySelector('.demand-input');
    const balanceCell = row.querySelector('.balance-cell');
    
    if (!stockInput || !demandInput || !balanceCell) return;
    
    const stock = parseDecimalInput(stockInput.value);
    const demand = parseDecimalInput(demandInput.value);
    const balance = stock - demand;
    
    balanceCell.textContent = formatNumberForDisplay(balance);
    balanceCell.classList.toggle('negative', balance < 0);
}

/**
 * Atualiza um coeficiente no tensor tecnológico
 */
function updateTensorCoefficient(inputId, outputId, input) {
    const value = parseDecimalInput(input.value);
    
    // Buscar a materialização de entrada no estado
    const inputMat = pageState.materializations.find(m => m.id === inputId);
    if (!inputMat) return;
    
    // Garantir que o mapa de tensores exista
    if (!inputMat.technologicalTensors) {
        inputMat.technologicalTensors = {};
    }
    
    // Atualizar o coeficiente
    inputMat.technologicalTensors[outputId] = value;
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Remove uma materialização do comitê
 */
function removeMaterialization(materializationId) {
    // Verificar se é a materialização principal do comitê
    if (materializationId === pageState.socialMaterializationId) {
        showErrorMessage("Não é possível remover o produto principal do comitê.");
        return;
    }
    
    if (!confirm("Tem certeza que deseja remover esta materialização?")) {
        return;
    }
    
    // Buscar o índice da materialização no array
    const index = pageState.materializations.findIndex(m => m.id === materializationId);
    if (index === -1) return;
    
    // Se a materialização já existe no servidor, marcá-la como excluída
    // em vez de removê-la completamente do array
    if (!pageState.materializations[index].isNew) {
        pageState.materializations[index].isDeleted = true;
    } else {
        // Se é uma materialização nova que ainda não foi salva, podemos
        // simplesmente removê-la do array
        pageState.materializations.splice(index, 1);
    }
    
    // Atualizar a interface
    updateMaterializationsUI();
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Adiciona uma materialização à tabela de estoque/demanda e matriz tecnológica
 */
function addMaterialization(materialization) {
    if (!pageState.id) {
        showErrorMessage("Selecione um comitê primeiro");
        return;
    }
    
    // Verificar se já existe no estado
    const exists = pageState.materializations.some(
        m => m.id === materialization.id && !m.isDeleted
    );
    
    if (exists) {
        showErrorMessage(`A materialização "${materialization.name}" já existe`);
        return;
    }
    
    // Criar objeto para nova materialização
    const newMatState = {
        id: materialization.id,
        name: materialization.name,
        type: materialization.type || "PRODUCT",
        demand: 0,
        stock: 0,
        isNew: true,
        isDeleted: false,
        technologicalTensors: {}
    };
    
    // Se temos um produto definido para o comitê, adicionar relação de insumo
    if (pageState.socialMaterializationId) {
        newMatState.technologicalTensors[pageState.socialMaterializationId] = 0;
    }
    
    // Adicionar ao estado
    pageState.materializations.push(newMatState);
    
    // Atualizar interface
    updateMaterializationsUI();
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Abre o modal de configuração de otimização para uma materialização
 */
function openOptimizationConfigModal(materializationId, materializationName) {
    // Esta funcionalidade parece ser parte da interface antiga
    // e não está completamente implementada no HTML atual
    alert("Funcionalidade de otimização não implementada nesta versão");
}

// Implementação de modais

/**
 * Abre o modal para criar nova materialização
 */
function openNewMaterializationModal() {
    const modal = document.getElementById('newMaterializationModal');
    const form = document.getElementById('newMaterializationForm');
    const errorMessage = document.getElementById('newMaterializationFormError');
    const successMessage = document.getElementById('newMaterializationFormSuccess');
    
    // Limpar mensagens e formulário
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
    if (form) form.reset();
    
    // Mostrar o modal
    if (modal) modal.style.display = 'flex';
    
    // Configurar o evento de submit do formulário
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            createNewMaterialization();
        };
    }
}

/**
 * Fecha o modal de nova materialização
 */
function closeNewMaterializationModal() {
    const modal = document.getElementById('newMaterializationModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Cria nova materialização social
 */
function createNewMaterialization() {
    const nameInput = document.getElementById('materialName');
    const typeSelect = document.getElementById('materialType');
    const descriptionInput = document.getElementById('materialDescription');
    const spinner = document.getElementById('newMaterializationModalSpinner');
    const errorMessage = document.getElementById('newMaterializationFormError');
    const successMessage = document.getElementById('newMaterializationFormSuccess');
    
    // Validar campos
    if (!nameInput || !nameInput.value.trim()) {
        if (errorMessage) {
            errorMessage.textContent = 'O nome da materialização é obrigatório';
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    // Preparar dados
    const payload = {
        name: nameInput.value.trim(),
        type: typeSelect ? typeSelect.value : 'PRODUCT',
        description: descriptionInput ? descriptionInput.value.trim() : ''
    };
    
    // Mostrar spinner
    if (spinner) spinner.style.display = 'inline-block';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Enviar para o servidor
    fetch('/api/planification/social-materializations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Erro HTTP: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(newMaterialization => {
        // Mostrar mensagem de sucesso
        if (successMessage) {
            successMessage.textContent = `Materialização "${newMaterialization.name}" criada com sucesso!`;
            successMessage.style.display = 'block';
        }
        
        // Adicionar à tabela
        addMaterialization(newMaterialization);
        
        // Limpar o formulário
        if (document.getElementById('newMaterializationForm')) {
            document.getElementById('newMaterializationForm').reset();
        }
        
        // Fechar o modal após um curto atraso
        setTimeout(() => {
            closeNewMaterializationModal();
        }, 2000);
    })
    .catch(error => {
        console.error('Erro ao criar materialização:', error);
        if (errorMessage) {
            errorMessage.textContent = `Erro ao criar materialização: ${error.message}`;
            errorMessage.style.display = 'block';
        }
    })
    .finally(() => {
        if (spinner) spinner.style.display = 'none';
    });
}

/**
 * Fecha o modal de resultados de otimização
 */
function closeOptimizationResultModal() {
    const modal = document.getElementById('optimizationResultModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Fecha o modal de configuração de otimização
 */
function closeOptimizationConfigModal() {
    const modal = document.getElementById('optimizationConfigModal');
    if (modal) modal.style.display = 'none';
}

// Substituir a função de salvamento existente para usar o novo endpoint
// Assumindo que a função existente é chamada 'saveChanges' ou algo similar
window.saveChanges = saveCommitteeState;