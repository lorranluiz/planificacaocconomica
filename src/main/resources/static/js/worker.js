// Script para controlar a página de planificação econômica

// Declarar variáveis globalmente
let currentInstanceId = null;
let allProducts = []; // Lista completa de produtos
let filteredProducts = []; // Produtos filtrados por tipo ou busca
let currentPage = 1;
let productsPerPage = 20; // Exibir 20 itens por página
let cartItems = []; // Itens no carrinho
let availableSocialParticipation = 0;

// Adicionar variáveis globais para armazenar os pedidos
let orderHistory = [];

// Verificar se o cabeçalho já foi inserido
function ensureHeader() {
    if (!document.querySelector('.nav-container')) {
        insertCommonHeader();
    }
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

// Mantém o código dentro do evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar cabeçalho comum - APENAS UMA VEZ
    ensureHeader();
    
    // Elementos principais da interface
    const instanceSelect = document.getElementById('instanceSelect');
    const certificateSection = document.getElementById('certificateSection');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const directInstanceIdInput = document.getElementById('directInstanceId');
    const searchInstanceBtn = document.getElementById('searchInstanceBtn');
    
    // Elementos da loja virtual
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const productsGrid = document.getElementById('productsGrid');
    const productsPagination = document.getElementById('productsPagination');
    const cartButton = document.getElementById('cartButton');
    const cartModal = document.getElementById('cartModal');
    const cartClose = document.getElementById('cartClose');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    const checkoutButton = document.getElementById('checkoutButton');
    
    // Elementos da modal de histórico
    const historyButton = document.getElementById('historyButton');
    const historyModal = document.getElementById('historyModal');
    const historyClose = document.getElementById('historyClose');
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const customDateGroup = document.getElementById('customDateGroup');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const applyDateFilter = document.getElementById('applyDateFilter');
    const historyLoading = document.getElementById('historyLoading');
    const historyTable = document.getElementById('historyTable');
    const historyTableBody = document.getElementById('historyTableBody');
    const emptyHistory = document.getElementById('emptyHistory');
    
    // Carregar lista de instâncias
    loadInstances();
    
    // Configurar eventos
    instanceSelect.addEventListener('change', handleInstanceChange);
    searchInstanceBtn.addEventListener('click', handleDirectSearch);
    
    // Permitir busca direta pelo ID ao pressionar Enter no campo de ID
    directInstanceIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleDirectSearch();
        }
    });
    
    // Configurar eventos da loja virtual
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterProducts(button.getAttribute('data-type'));
            
            // Atualizar estado dos botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm.length >= 2) {
            showAutocomplete(searchTerm);
        } else {
            autocompleteDropdown.style.display = 'none';
        }
    });
    
    cartButton.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        renderCartItems();
    });
    
    cartClose.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    checkoutButton.addEventListener('click', finalizePurchase);
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
        if (e.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });
    
    // Configurar eventos da modal de histórico
    historyButton.addEventListener('click', openHistoryModal);
    historyClose.addEventListener('click', closeHistoryModal);
    dateFilter.addEventListener('change', handleDateFilterChange);
    typeFilter.addEventListener('change', applyHistoryFilters);
    statusFilter.addEventListener('change', applyHistoryFilters);
    applyDateFilter.addEventListener('click', applyHistoryFilters);
    
    // Definir data atual como padrão para os campos de data
    const today = new Date().toISOString().split('T')[0];
    startDate.value = today;
    endDate.value = today;
    
    /**
     * Abre a modal de histórico e carrega os pedidos
     */
    function openHistoryModal() {
        historyModal.style.display = 'flex';
        
        // Resetar filtros
        dateFilter.value = 'all';
        typeFilter.value = 'all';
        statusFilter.value = 'all';
        customDateGroup.style.display = 'none';
        
        // Exibir os pedidos atuais sem nenhuma filtragem
        renderFilteredHistory(orderHistory);
    }
    
    /**
     * Fecha a modal de histórico
     */
    function closeHistoryModal() {
        historyModal.style.display = 'none';
    }
    
    /**
     * Gerencia a exibição do grupo de datas personalizadas
     */
    function handleDateFilterChange() {
        if (dateFilter.value === 'custom') {
            customDateGroup.style.display = 'flex';
        } else {
            customDateGroup.style.display = 'none';
            applyHistoryFilters();
        }
    }
    
    /**
     * Aplica os filtros ao histórico de pedidos
     */
    function applyHistoryFilters() {
        historyLoading.style.display = 'flex';
        historyTable.style.display = 'none';
        emptyHistory.style.display = 'none';
        
        // Simular um tempo de carregamento para melhor experiência do usuário
        setTimeout(() => {
            const dateValue = dateFilter.value;
            const typeValue = typeFilter.value;
            const statusValue = statusFilter.value;
            
            // Criar uma cópia do histórico original
            let filteredOrders = [...orderHistory];
            
            // Aplicar filtro de data
            if (dateValue !== 'all') {
                const currentDate = new Date();
                let startDateFilter;
                
                switch(dateValue) {
                    case 'today':
                        startDateFilter = new Date(currentDate.setHours(0, 0, 0, 0));
                        break;
                    case 'week':
                        startDateFilter = new Date(currentDate);
                        startDateFilter.setDate(currentDate.getDate() - 7);
                        break;
                    case 'month':
                        startDateFilter = new Date(currentDate);
                        startDateFilter.setMonth(currentDate.getMonth() - 1);
                        break;
                    case 'year':
                        startDateFilter = new Date(currentDate);
                        startDateFilter.setFullYear(currentDate.getFullYear() - 1);
                        break;
                    case 'custom':
                        startDateFilter = new Date(startDate.value);
                        const endDateFilter = new Date(endDate.value);
                        endDateFilter.setHours(23, 59, 59, 999); // Final do dia
                        
                        filteredOrders = filteredOrders.filter(order => {
                            const orderDate = new Date(order.date);
                            return orderDate >= startDateFilter && orderDate <= endDateFilter;
                        });
                        
                        // Pular o filtro padrão abaixo
                        break;
                }
                
                // Aplicar filtro de data padrão (exceto para 'custom')
                if (dateValue !== 'custom') {
                    filteredOrders = filteredOrders.filter(order => {
                        return new Date(order.date) >= startDateFilter;
                    });
                }
            }
            
            // Aplicar filtro de tipo (PRODUCT ou SERVICE)
            if (typeValue !== 'all') {
                filteredOrders = filteredOrders.filter(order => {
                    // Verificar se pelo menos um item do pedido corresponde ao tipo selecionado
                    return order.items.some(item => item.type === typeValue);
                });
            }
            
            // Aplicar filtro de status
            if (statusValue !== 'all') {
                filteredOrders = filteredOrders.filter(order => order.status === statusValue);
            }
            
            // Renderizar os pedidos filtrados
            renderFilteredHistory(filteredOrders);
            
            historyLoading.style.display = 'none';
        }, 500);
    }
    
    /**
     * Renderiza os pedidos filtrados na tabela de histórico
     */
    function renderFilteredHistory(orders) {
        historyTableBody.innerHTML = '';
        
        if (orders.length === 0) {
            historyTable.style.display = 'none';
            emptyHistory.style.display = 'block';
            return;
        }
        
        historyTable.style.display = 'table';
        emptyHistory.style.display = 'none';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            
            // Formatar a data
            const formattedDate = formatDate(order.date);
            
            // Formatar o status
            const statusClass = `status-${order.status}`;
            let statusText = '';
            switch(order.status) {
                case 'pending': statusText = 'Pendente'; break;
                case 'processing': statusText = 'Em Processamento'; break;
                case 'completed': statusText = 'Concluído'; break;
                case 'cancelled': statusText = 'Cancelado'; break;
                default: statusText = order.status;
            }
            
            // Formatar os tipos de itens
            const itemTypes = order.items.map(item => item.type).filter((value, index, self) => self.indexOf(value) === index);
            const typeLabels = itemTypes.map(type => type === 'PRODUCT' ? 'Produto' : 'Serviço').join(', ');
            
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${formattedDate}</td>
                <td>${order.items.length} ${order.items.length > 1 ? 'itens' : 'item'} <span class="item-types">(${typeLabels})</span></td>
                <td>ℳ ${order.total.toFixed(2)}</td>
                <td><span class="order-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="order-actions">
                        <button class="order-action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                    </div>
                </td>
            `;
            
            historyTableBody.appendChild(row);
        });
    }

    /**
     * Carrega a lista de instâncias disponíveis (apenas do tipo WORKER)
     */
    function loadInstances() {
        fetch('/api/instances?type=WORKER')  // Atualizado o endpoint
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
                    option.textContent = instance.name || `Trabalhador #${instance.id}`;
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
            certificateSection.style.display = 'none';
            return;
        }
        
        // Armazenar o ID da instância selecionada
        currentInstanceId = instanceId;
        
        // Mostrar spinner de carregamento
        loadingSpinner.style.display = 'inline-block';
        
        // Carregar dados do trabalhador
        loadWorkerData(instanceId);
    }
    
    /**
     * Manipula a busca direta por ID de trabalhador
     */
    function handleDirectSearch() {
        const instanceId = directInstanceIdInput.value.trim();
        
        if (!instanceId) {
            showError('Por favor, informe um ID válido');
            return;
        }
        
        // Verificar se o valor é um número inteiro positivo
        if (!/^\d+$/.test(instanceId) || parseInt(instanceId) <= 0) {
            showError('O ID deve ser um número inteiro positivo');
            return;
        }
        
        // Limpar o campo após iniciar a busca
        directInstanceIdInput.value = '';
        
        // Armazenar o ID da instância selecionada
        currentInstanceId = instanceId;
        
        // Mostrar spinner de carregamento
        loadingSpinner.style.display = 'inline-block';
        
        // Ocultar a seção do certificado durante o carregamento
        if (certificateSection.style.display !== 'none') {
            certificateSection.style.display = 'none';
        }
        
        // Carregar dados do trabalhador diretamente do servidor
        loadWorkerData(instanceId);
        
        // Limpar seleção do dropdown para evitar conflitos
        instanceSelect.value = '';
    }
    
    /**
     * Carrega os dados do trabalhador para exibir no certificado
     * Modificado para tentar vários endpoints caso necessário
     */
    function loadWorkerData(instanceId) {
        console.log(`Tentando carregar dados do trabalhador com ID: ${instanceId}`);
        
        // Usar o endpoint específico para instâncias do tipo worker
        const endpoint = `/api/instances/${instanceId}/worker`;
        
        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    console.error(`Erro na resposta da API: ${response.status} ${response.statusText}`);
                    
                    // Se for 404, tentar o endpoint genérico como fallback
                    if (response.status === 404) {
                        console.log('Endpoint específico não encontrado. Tentando endpoint genérico...');
                        return fetch(`/api/instances/${instanceId}`).then(fallbackResponse => {
                            if (!fallbackResponse.ok) {
                                // Como último recurso, tentar o endpoint legado
                                console.log('Endpoint genérico não encontrado. Tentando endpoint legado...');
                                return fetch(`/api/planification/instances/${instanceId}`).then(legacyResponse => {
                                    if (!legacyResponse.ok) {
                                        throw new Error(`Trabalhador não encontrado com ID: ${instanceId}`);
                                    }
                                    return legacyResponse.json();
                                });
                            }
                            return fallbackResponse.json();
                        });
                    }
                    
                    throw new Error(`Erro ao carregar dados do trabalhador: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Dados do trabalhador carregados com sucesso:', data);
                
                // Verificar se o tipo de instância é WORKER
                if (data.type !== 'WORKER') {
                    throw new Error('A instância selecionada não é um trabalhador');
                }
                
                // Preencher os dados do certificado
                fillWorkerCertificate(data);
                
                // Exibir a seção do certificado
                certificateSection.style.display = 'block';
                
                // Esconder spinner
                loadingSpinner.style.display = 'none';
                
                // Mostrar mensagem de sucesso
                showSuccess(`Trabalhador #${instanceId} carregado com sucesso!`);
                
                // Carregar materializações disponíveis para a loja virtual
                loadAvailableMaterializations();
                
                // Carregar histórico de pedidos
                loadOrderHistory(instanceId);
            })
            .catch(error => {
                console.error('Erro detalhado ao carregar dados do trabalhador:', error);
                showError(`Erro ao carregar dados do trabalhador: ${error.message}`);
                loadingSpinner.style.display = 'none';
                certificateSection.style.display = 'none';
            });
    }
    
    /**
     * Preenche o certificado de trabalho com os dados do trabalhador
     */
    function fillWorkerCertificate(data) {
        // Verificar se os dados são válidos
        if (!data) {
            console.error('Dados do trabalhador inválidos');
            return;
        }
        
        console.log('Preenchendo certificado com dados:', data);
        
        // Buscar os elementos do certificado
        const workerName = document.getElementById('workerName');
        const associatedCouncil = document.getElementById('associatedCouncil');
        const residentsAssociation = document.getElementById('residentsAssociation');
        const workedHours = document.getElementById('workedHours');
        const socialParticipation = document.getElementById('socialParticipation');
        
        try {
            // Preencher com os dados recebidos
            // Para cada campo, verificar se o dado existe antes de preencher
            if (data.name) {
                workerName.textContent = data.name;
            } else {
                workerName.textContent = `Trabalhador #${data.id}`;
            }
            
            // Preencher conselho associado
            if (data.councilName) {
                associatedCouncil.textContent = data.councilName;
            } else if (data.popularCouncilAssociatedWithCommitteeOrWorker) {
                associatedCouncil.textContent = `Conselho #${data.popularCouncilAssociatedWithCommitteeOrWorker}`;
            } else {
                associatedCouncil.textContent = 'Não associado';
            }
            
            // Preencher associação de moradores
            if (data.residentsAssociationName) {
                residentsAssociation.textContent = data.residentsAssociationName;
            } else if (data.idAssociatedWorkerResidentsAssociation) {
                residentsAssociation.textContent = `Associação #${data.idAssociatedWorkerResidentsAssociation}`;
            } else {
                residentsAssociation.textContent = 'Não associada';
            }
            
            // Horas trabalhadas
            if (data.hoursAtElectronicPoint !== undefined && data.hoursAtElectronicPoint !== null) {
                workedHours.textContent = `${parseFloat(data.hoursAtElectronicPoint).toFixed(2)} horas`;
            } else {
                workedHours.textContent = '0.00 horas';
            }
            
            // Participação social - Multiplicar por 10^8 para exibição
            if (data.estimatedIndividualParticipationInSocialWork !== undefined && 
                data.estimatedIndividualParticipationInSocialWork !== null) {
                // Converter para número e multiplicar por 10^8 (100 milhões)
                const participation = parseFloat(data.estimatedIndividualParticipationInSocialWork) * 100000000;
                socialParticipation.textContent = `ℳ ${participation.toFixed(2)}`;
                
                // Atualizar a variável global para uso na loja
                // Importante: manter o valor original aqui para cálculos posteriores
                availableSocialParticipation = parseFloat(data.estimatedIndividualParticipationInSocialWork);
            } else {
                socialParticipation.textContent = 'ℳ 0.00';
                availableSocialParticipation = 0;
            }
            
        } catch (err) {
            console.error('Erro ao preencher certificado:', err);
            showError('Erro ao preencher dados do certificado');
        }
    }
    
    /**
     * Carrega o histórico de pedidos do trabalhador
     */
    function loadOrderHistory(instanceId) {
        // Verificar se os elementos necessários existem no DOM
        const ordersLoadingElement = document.getElementById('ordersLoading');
        const ordersTableElement = document.getElementById('ordersTable');
        const emptyOrdersElement = document.getElementById('emptyOrders');
        
        // Se algum elemento não existir, registrar um aviso e retornar
        if (!ordersLoadingElement || !ordersTableElement || !emptyOrdersElement) {
            console.warn('Elementos de histórico de pedidos não encontrados no DOM. Pulando renderização.');
            return;
        }
        
        // Mostrar loader
        ordersLoadingElement.style.display = 'flex';
        ordersTableElement.style.display = 'none';
        emptyOrdersElement.style.display = 'none';
        
        // Simular chamada de API com um atraso
        setTimeout(() => {
            // Como esta é uma API fictícia, vamos gerar dados de exemplo
            // Em uma aplicação real, esta seria uma chamada fetch para a API
            generateMockOrderHistory(instanceId);
            
            // Processar os resultados
            if (orderHistory && orderHistory.length > 0) {
                renderOrderHistory();
                ordersTableElement.style.display = 'table';
                emptyOrdersElement.style.display = 'none';
            } else {
                emptyOrdersElement.style.display = 'block';
                ordersTableElement.style.display = 'none';
            }
            
            // Esconder loader
            ordersLoadingElement.style.display = 'none';
            
        }, 1500); // Simular um atraso na resposta da API
    }
    
    /**
     * Gera produtos de exemplo para fins de demonstração
     */
    function generateMockProducts() {
        const products = [];
        const types = ['PRODUCT', 'SERVICE'];
        const productNames = [
            'Arroz', 'Feijão', 'Açúcar', 'Café', 'Óleo', 'Leite', 'Pão', 'Macarrão',
            'Carne', 'Frango', 'Peixe', 'Ovos', 'Tomate', 'Cebola', 'Alface', 'Batata',
            'Cenoura', 'Banana', 'Maçã', 'Laranja', 'Uva', 'Mamão', 'Melancia', 'Abacaxi'
        ];
        
        const serviceNames = [
            'Consulta Médica', 'Dentista', 'Terapia', 'Corte de Cabelo', 'Manicure',
            'Manutenção Elétrica', 'Encanamento', 'Aulas de Música', 'Curso de Idiomas',
            'Transporte', 'Lavagem de Roupa', 'Limpeza Doméstica', 'Jardinagem',
            'Conserto de Eletrônicos', 'Aulas de Dança', 'Consultoria', 'Massagem'
        ];
        
        // Gerar entre 30 e 60 produtos
        const productCount = Math.floor(Math.random() * 31) + 30;
        
        for (let i = 0; i < productCount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const name = type === 'PRODUCT' 
                ? productNames[Math.floor(Math.random() * productNames.length)]
                : serviceNames[Math.floor(Math.random() * serviceNames.length)];
            
            // Gerar um ID único
            const id = i + 1;
            
            // Gerar um preço entre 0.1 e 10.0
            const price = Math.random() * 9.9 + 0.1;
            
            products.push({
                id: id,
                name: name + ' #' + id, // Adicionar número para torná-los únicos
                type: type,
                price: parseFloat(price.toFixed(2)),
                description: `Descrição do ${type === 'PRODUCT' ? 'produto' : 'serviço'} ${name} #${id}`,
                imageUrl: null // No caso de querer exibir uma imagem no futuro
            });
        }
        
        return products;
    }
    
    /**
     * Gera dados de exemplo para o histórico de pedidos (simulando uma API)
     */
    function generateMockOrderHistory(instanceId) {
        // Em uma aplicação real, estes dados viriam da API
        const statuses = ['pending', 'processing', 'completed', 'cancelled'];
        const currentDate = new Date();
        
        // Limpar o histórico atual
        orderHistory = [];
        
        // Gerar entre 5 e 15 pedidos de exemplo (mais pedidos para melhor testar os filtros)
        const orderCount = Math.floor(Math.random() * 11) + 5;
        
        for (let i = 0; i < orderCount; i++) {
            // Gerar uma data aleatória nos últimos 60 dias
            const orderDate = new Date(currentDate);
            orderDate.setDate(currentDate.getDate() - Math.floor(Math.random() * 60));
            
            // Gerar entre 1 e 4 itens para o pedido
            const items = [];
            const itemCount = Math.floor(Math.random() * 4) + 1;
            
            let orderTotal = 0;
            
            for (let j = 0; j < itemCount; j++) {
                // Selecionar um produto aleatório da lista de produtos disponíveis
                // ou criar um produto de exemplo se ainda não há produtos disponíveis
                let product;
                
                if (allProducts.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allProducts.length);
                    product = allProducts[randomIndex];
                } else {
                    // Criar um produto aleatório se não houver produtos carregados
                    const isProduct = Math.random() > 0.3; // 70% chance de ser produto, 30% chance de ser serviço
                    const type = isProduct ? 'PRODUCT' : 'SERVICE';
                    
                    const productNames = [
                        'Arroz', 'Feijão', 'Açúcar', 'Café', 'Óleo', 'Leite', 'Pão', 'Macarrão',
                        'Carne', 'Frango', 'Peixe', 'Ovos', 'Tomate', 'Cebola'
                    ];
                    
                    const serviceNames = [
                        'Consulta Médica', 'Dentista', 'Corte de Cabelo', 'Transporte',
                        'Manutenção Elétrica', 'Limpeza', 'Curso de Idiomas'
                    ];
                    
                    const names = type === 'PRODUCT' ? productNames : serviceNames;
                    const name = names[Math.floor(Math.random() * names.length)] + ' #' + (Math.floor(Math.random() * 100) + 1);
                    
                    product = {
                        id: Math.floor(Math.random() * 10000) + 1,
                        name: name,
                        type: type,
                        price: parseFloat((Math.random() * 9.9 + 0.1).toFixed(2))
                    };
                }
                
                const quantity = Math.floor(Math.random() * 3) + 1;
                const price = product.price;
                const subtotal = price * quantity;
                
                orderTotal += subtotal;
                
                items.push({
                    id: product.id,
                    name: product.name,
                    type: product.type,
                    price: price,
                    quantity: quantity,
                    subtotal: subtotal
                });
            }
            
            // Gerar um status aleatório mas favorecendo 'completed' para ter mais exemplos
            let status;
            const statusRandom = Math.random();
            if (statusRandom < 0.5) { // 50% chance de ser completed
                status = 'completed';
            } else if (statusRandom < 0.7) { // 20% chance de ser pending
                status = 'pending';
            } else if (statusRandom < 0.9) { // 20% chance de ser processing
                status = 'processing';
            } else { // 10% chance de ser cancelled
                status = 'cancelled';
            }
            
            // Criar o objeto de pedido
            const order = {
                id: `ORD-${instanceId}-${Date.now().toString().substr(-6)}-${i}`,
                date: orderDate,
                items: items,
                total: orderTotal,
                status: status,
                instanceId: instanceId
            };
            
            orderHistory.push(order);
        }
        
        // Ordenar por data (mais recentes primeiro)
        orderHistory.sort((a, b) => b.date - a.date);
    }
    
    /**
     * Renderiza o histórico de pedidos na tabela
     */
    function renderOrderHistory() {
        const tableBody = document.getElementById('ordersTableBody');
        tableBody.innerHTML = '';
        
        orderHistory.forEach(order => {
            const row = document.createElement('tr');
            
            // Formatar a data
            const formattedDate = formatDate(order.date);
            
            // Formatar o status
            const statusClass = `status-${order.status}`;
            let statusText = '';
            switch(order.status) {
                case 'pending': statusText = 'Pendente'; break;
                case 'processing': statusText = 'Em Processamento'; break;
                case 'completed': statusText = 'Concluído'; break;
                case 'cancelled': statusText = 'Cancelado'; break;
                default: statusText = order.status;
            }
            
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${formattedDate}</td>
                <td>${order.items.length} ${order.items.length > 1 ? 'itens' : 'item'}</td>
                <td>ℳ ${order.total.toFixed(2)}</td>
                <td><span class="order-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="order-actions">
                        <button class="order-action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Formata uma data para exibição
     */
    function formatDate(date) {
        const options = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleDateString('pt-BR', options);
    }
    
    /**
     * Carrega as materializações sociais disponíveis para retirada
     */
    function loadAvailableMaterializations() {
        // Verificar se o elemento productsGrid existe antes de acessá-lo
        const productsGridElement = document.getElementById('productsGrid');
        if (!productsGridElement) {
            console.warn('Elemento productsGrid não encontrado. Pulando carregamento de materializações.');
            return;
        }
        
        // Mostrar algum indicador de carregamento para os produtos, se necessário
        productsGridElement.innerHTML = '<div class="loading-container"><span class="loading" style="display: inline-block;"></span><p>Carregando materializações disponíveis...</p></div>';
        
        // Em uma aplicação real, você buscaria estes dados da API
        // Por exemplo: fetch('/api/available-materializations')
        
        setTimeout(() => {
            // Simular dados retornados pela API
            allProducts = generateMockProducts();
            
            // Inicialmente, exibir todos os produtos
            filteredProducts = [...allProducts];
            
            // Renderizar os produtos na interface
            renderProducts();
            
            // Atualizar os botões de retirada com base no saldo disponível
            updateWithdrawButtons();
        }, 1000); // Simular um tempo de carregamento
    }
});

/**
 * Renderiza os produtos na interface
 */
function renderProducts() {
    // Verificar se os elementos necessários existem
    const productsGrid = document.getElementById('productsGrid');
    const productsPagination = document.getElementById('productsPagination');
    
    if (!productsGrid) {
        console.warn('Elemento productsGrid não encontrado. Impossível renderizar produtos.');
        return;
    }
    
    // Limpar grid de produtos
    productsGrid.innerHTML = '';
    
    // Calcular paginação
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    // Certificar-se que a página atual está dentro dos limites
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    // Obter produtos da página atual
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, filteredProducts.length);
    const currentProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Verificar se temos produtos para exibir
    if (currentProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search fa-3x"></i>
                <p>Nenhuma materialização social encontrada com os filtros selecionados.</p>
            </div>
        `;
        if (productsPagination) productsPagination.innerHTML = '';
        return;
    }
    
    // Adicionar cada produto ao grid
    currentProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Escolher o ícone com base no tipo
        const icon = product.type === 'PRODUCT' ? 'box' : 'concierge-bell';
        
        productCard.innerHTML = `
            <div class="product-image">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">ℳ ${product.price.toFixed(2)}</div>
                <div class="product-action">
                    <button class="withdraw-btn" data-id="${product.id}">
                        Retirar
                    </button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    // Configurar botões de retirada
    const withdrawButtons = document.querySelectorAll('.withdraw-btn');
    withdrawButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToCart(productId);
        });
    });
    
    // Renderizar paginação se o elemento existir
    if (productsPagination) {
        renderPagination(totalPages);
    }
}

/**
 * Renderiza os controles de paginação
 */
function renderPagination(totalPages) {
    const productsPagination = document.getElementById('productsPagination');
    if (!productsPagination) return;
    
    productsPagination.innerHTML = '';
    
    // Se tivermos apenas uma página, não exibir paginação
    if (totalPages <= 1) return;
    
    // Botão para primeira página
    if (currentPage > 1) {
        addPaginationButton('&laquo;', 1);
    }
    
    // Botão para página anterior
    if (currentPage > 1) {
        addPaginationButton('&lsaquo;', currentPage - 1);
    }
    
    // Determinar o grupo de páginas atual (grupos de 10)
    const pageGroup = Math.floor((currentPage - 1) / 10);
    const startPage = pageGroup * 10 + 1;
    const endPage = Math.min(startPage + 9, totalPages);
    
    // Adicionar botão de salto grande para trás (100 páginas)
    if (currentPage > 100) {
        addPaginationButton('&laquo; -100', Math.max(1, currentPage - 100));
    }
    
    // Adicionar botão de salto para trás (10 páginas)
    if (currentPage > 10) {
        addPaginationButton('-10', Math.max(1, startPage - 10));
    }
    
    // Adicionar botões de página para o grupo atual
    for (let i = startPage; i <= endPage; i++) {
        addPaginationButton(i.toString(), i, i === currentPage);
    }
    
    // Adicionar botão de salto para frente (10 páginas)
    if (endPage + 1 <= totalPages) {
        addPaginationButton('+10', Math.min(totalPages, startPage + 10));
    }
    
    // Adicionar botão de salto grande para frente (100 páginas)
    if (currentPage + 100 <= totalPages) {
        addPaginationButton('+100 &raquo;', Math.min(totalPages, currentPage + 100));
    }
    
    // Botão para próxima página
    if (currentPage < totalPages) {
        addPaginationButton('&rsaquo;', currentPage + 1);
    }
    
    // Botão para última página
    if (currentPage < totalPages) {
        addPaginationButton('&raquo;', totalPages);
    }
    
    // Função auxiliar para adicionar botões de paginação
    function addPaginationButton(text, page, isActive = false) {
        const button = document.createElement('button');
        button.className = `pagination-btn${isActive ? ' active' : ''}`;
        button.innerHTML = text;
        
        button.addEventListener('click', () => {
            currentPage = page;
            renderProducts();
            window.scrollTo(0, 0); // Rolar para o topo ao mudar de página
        });
        
        productsPagination.appendChild(button);
    }
}

/**
 * Filtra produtos por tipo (PRODUCT ou SERVICE ou all)
 */
function filterProducts(type) {
    if (type === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.type === type);
    }
    
    // Resetar para a primeira página
    currentPage = 1;
    
    // Renderizar produtos filtrados
    renderProducts();
}

/**
 * Exibe sugestões de autocomplete ao buscar produtos
 */
function showAutocomplete(searchTerm) {
    // Verificar se os elementos necessários existem
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const searchInput = document.getElementById('searchInput');
    
    if (!autocompleteDropdown || !searchInput) {
        console.warn('Elementos de autocomplete não encontrados.');
        return;
    }
    
    // Filtrar produtos que correspondem ao termo de busca
    const matches = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // Limitar a 5 resultados
    const limitedMatches = matches.slice(0, 5);
    
    // Limpar dropdown existente
    autocompleteDropdown.innerHTML = '';
    
    if (limitedMatches.length > 0) {
        // Adicionar cada correspondência ao dropdown
        limitedMatches.forEach(product => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = product.name;
            
            item.addEventListener('click', () => {
                // Ao clicar em um item, preencha o campo de busca e aplique o filtro
                searchInput.value = product.name;
                autocompleteDropdown.style.display = 'none';
                
                // Filtrar para mostrar apenas este produto
                filteredProducts = [product];
                currentPage = 1;
                renderProducts();
            });
            
            autocompleteDropdown.appendChild(item);
        });
        
        // Exibir o dropdown
        autocompleteDropdown.style.display = 'block';
    } else {
        autocompleteDropdown.style.display = 'none';
    }
}

/**
 * Adiciona um produto ao carrinho
 */
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showError('Produto não encontrado');
        return;
    }
    
    // Verificar se já temos este produto no carrinho
    const existingItem = cartItems.find(item => item.product.id === productId);
    
    if (existingItem) {
        // Atualizar quantidade
        existingItem.quantity += 1;
    } else {
        // Adicionar novo item
        cartItems.push({
            product: product,
            quantity: 1
        });
    }
    
    // Atualizar contador de itens no carrinho
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cartItems.length;
    }
    
    // Exibir mensagem de sucesso
    showSuccess(`${product.name} adicionado ao carrinho`);
    
    // Verificar se ainda temos saldo disponível para retirar mais itens
    updateWithdrawButtons();
}

/**
 * Verifica se ainda temos saldo disponível e atualiza botões de retirada
 */
function updateWithdrawButtons() {
    // Verificar se há botões na interface
    const withdrawButtons = document.querySelectorAll('.withdraw-btn');
    if (withdrawButtons.length === 0) return;
    
    // Calcular total atual no carrinho
    let cartTotal = 0;
    cartItems.forEach(item => {
        cartTotal += item.product.price * item.quantity;
    });
    
    // Verificar se estamos estourando o saldo do trabalhador
    // Multiplicamos availableSocialParticipation por 10^8 para obter o valor correto em ℳ
    const availableBalance = availableSocialParticipation * 100000000;
    
    // Se o total no carrinho for maior que o saldo disponível, desabilitar todos os botões
    if (cartTotal > availableBalance) {
        withdrawButtons.forEach(button => {
            button.disabled = true;
            button.textContent = 'Sem saldo';
        });
    } else {
        // Senão, habilitar todos os botões
        withdrawButtons.forEach(button => {
            button.disabled = false;
            button.textContent = 'Retirar';
        });
    }
}

/**
 * Exibe os detalhes de um pedido
 */
function viewOrderDetails(orderId) {
    // Encontrar o pedido pelo ID
    const order = orderHistory.find(order => order.id === orderId);
    
    if (!order) {
        showError('Pedido não encontrado');
        return;
    }
    
    // Preencher os detalhes no modal
    document.getElementById('orderDetailId').textContent = order.id;
    document.getElementById('orderDetailDate').textContent = formatDate(order.date);
    
    // Formatar o status
    let statusText = '';
    switch(order.status) {
        case 'pending': statusText = 'Pendente'; break;
        case 'processing': statusText = 'Em Processamento'; break;
        case 'completed': statusText = 'Concluído'; break;
        case 'cancelled': statusText = 'Cancelado'; break;
        default: statusText = order.status;
    }
    
    const statusClass = `status-${order.status}`;
    document.getElementById('orderDetailStatus').innerHTML = 
        `<span class="order-status ${statusClass}">${statusText}</span>`;
    
    document.getElementById('orderDetailTotal').textContent = `ℳ ${order.total.toFixed(2)}`;
    
    // Preencher a tabela de itens
    const itemsTableBody = document.getElementById('orderItemsTableBody');
    itemsTableBody.innerHTML = '';
    
    order.items.forEach(item => {
        const row = document.createElement('tr');
        
        let typeText = item.type === 'PRODUCT' ? 'Produto' : 'Serviço';
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${typeText}</td>
            <td>${item.quantity}</td>
            <td>ℳ ${item.price.toFixed(2)}</td>
            <td>ℳ ${item.subtotal.toFixed(2)}</td>
        `;
        
        itemsTableBody.appendChild(row);
    });
    
    // Exibir o modal
    document.getElementById('orderDetailsModal').style.display = 'block';
}

/**
 * Finaliza a compra
 */
function finalizePurchase() {
    if (cartItems.length === 0) {
        showError('Seu carrinho está vazio');
        return;
    }
    
    // Verificar se o usuário tem saldo suficiente
    let orderTotal = 0;
    cartItems.forEach(item => {
        orderTotal += item.product.price * item.quantity;
    });
    
    // Multiplicar availableSocialParticipation por 10^8 para obter o valor correto em ℳ
    const availableBalance = availableSocialParticipation * 100000000;
    
    // Se o total for maior que o saldo disponível, mostrar mensagem e não finalizar
    if (orderTotal > availableBalance) {
        showError(`Saldo insuficiente. Total do pedido: ℳ ${orderTotal.toFixed(2)}, Saldo disponível: ℳ ${availableBalance.toFixed(2)}`);
        return;
    }
    
    // Mostrar indicador de processamento
    const checkoutButton = document.getElementById('checkoutButton');
    const originalText = checkoutButton.textContent;
    checkoutButton.disabled = true;
    checkoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    // Preparar os dados do pedido
    const orderItems = cartItems.map(item => ({
        id: item.product.id,
        name: item.product.name,
        type: item.product.type,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity
    }));
    
    const order = {
        id: `ORD-${currentInstanceId}-${Date.now().toString().substr(-6)}-${orderHistory.length}`,
        date: new Date(),
        items: orderItems,
        total: orderTotal,
        status: 'pending',
        instanceId: currentInstanceId
    };
    
    // Simular chamada de API para salvar o pedido
    setTimeout(() => {
        // Em uma aplicação real, seria uma chamada fetch para a API
        orderHistory.unshift(order); // Adicionar no início da lista (mais recente)
        
        // Atualizar o histórico de pedidos na interface
        renderOrderHistory();
        
        // Limpar o carrinho
        cartItems = [];
        document.getElementById('cartCount').textContent = '0';
        
        // Restaurar o saldo disponível para teste (em um sistema real não faria isso)
        // Aqui está apenas para facilitar o teste da interface
        // Note que o valor é incrementado no formato original (sem multiplicação)
        availableSocialParticipation += orderTotal / 100000000;
        
        // Exibir o valor atualizado multiplicado por 10^8
        document.getElementById('socialParticipation').textContent = 
            `ℳ ${(availableSocialParticipation * 100000000).toFixed(2)}`;
        
        // Atualizar os botões "Retirar"
        updateWithdrawButtons();
        
        // Fechar modal do carrinho
        document.getElementById('cartModal').style.display = 'none';
        
        // Exibir mensagem de sucesso
        showSuccess('Pedido realizado com sucesso!');
        
        // Restaurar botão de checkout
        checkoutButton.disabled = false;
        checkoutButton.textContent = originalText;
        
        // Se o histórico estava vazio antes, mostrar a tabela agora
        if (document.getElementById('emptyOrders').style.display === 'block') {
            document.getElementById('emptyOrders').style.display = 'none';
            document.getElementById('ordersTable').style.display = 'table';
        }
    }, 2000);
}

/**
 * Renderiza os itens no carrinho de compras
 */
function renderCartItems() {
    const cartItemsElement = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    // Limpar o conteúdo atual
    cartItemsElement.innerHTML = '';
    
    // Se o carrinho estiver vazio, mostrar mensagem
    if (cartItems.length === 0) {
        cartItemsElement.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
        cartTotalElement.textContent = 'ℳ 0,00';
        return;
    }
    
    // Calcular o valor total
    let totalValue = 0;
    
    // Adicionar cada item ao carrinho
    cartItems.forEach(item => {
        const subtotal = item.product.price * item.quantity;
        totalValue += subtotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        // Escolher ícone com base no tipo
        const icon = item.product.type === 'PRODUCT' ? 'box' : 'concierge-bell';
        
        itemElement.innerHTML = `
            <div class="cart-item-image">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="cart-item-info">
                <div class="cart-item-title">${item.product.name}</div>
                <div class="cart-item-price">ℳ ${item.product.price.toFixed(2)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn decrease-btn" data-id="${item.product.id}">-</button>
                    <span class="quantity-input">${item.quantity}</span>
                    <button class="quantity-btn increase-btn" data-id="${item.product.id}">+</button>
                </div>
                <button class="remove-item-btn" data-id="${item.product.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        cartItemsElement.appendChild(itemElement);
    });
    
    // Configurar eventos para os botões de quantidade
    const decreaseBtns = document.querySelectorAll('.decrease-btn');
    decreaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            updateCartItemQuantity(productId, -1);
        });
    });
    
    const increaseBtns = document.querySelectorAll('.increase-btn');
    increaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            updateCartItemQuantity(productId, 1);
        });
    });
    
    // Configurar eventos para os botões de remover
    const removeBtns = document.querySelectorAll('.remove-item-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            removeCartItem(productId);
        });
    });
    
    // Atualizar o total
    cartTotalElement.textContent = `ℳ ${totalValue.toFixed(2)}`;
}

/**
 * Atualiza a quantidade de um item no carrinho
 * @param {number} productId - ID do produto a ser atualizado
 * @param {number} change - Valor a ser adicionado ou subtraído da quantidade atual
 */
function updateCartItemQuantity(productId, change) {
    // Encontrar o item no carrinho
    const item = cartItems.find(item => item.product.id === productId);
    if (!item) return;
    
    // Aplicar alteração na quantidade
    const newQuantity = item.quantity + change;
    
    // Se a nova quantidade for 0 ou negativa, remover o item do carrinho
    if (newQuantity <= 0) {
        removeCartItem(productId);
        return;
    }
    
    // Atualizar a quantidade
    item.quantity = newQuantity;
    
    // Atualizar a interface
    renderCartItems();
    
    // Verificar saldo disponível
    updateWithdrawButtons();
}

/**
 * Remove um item do carrinho
 * @param {number} productId - ID do produto a ser removido
 */
function removeCartItem(productId) {
    // Filtrar o item do array de itens do carrinho
    cartItems = cartItems.filter(item => item.product.id !== productId);
    
    // Atualizar o contador do carrinho
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cartItems.length;
    }
    
    // Atualizar a interface
    renderCartItems();
    
    // Verificar saldo disponível
    updateWithdrawButtons();
}

/**
 * Formata uma data para exibição
 */
function formatDate(date) {
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString('pt-BR', options);
}