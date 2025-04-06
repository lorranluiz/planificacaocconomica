// Script para controlar a página de planificação econômica

// Declarar variáveis globalmente
let currentInstanceId = null;
let allProducts = []; // Lista completa de produtos
let filteredProducts = []; // Produtos filtrados por tipo ou busca
let currentPage = 1;
let productsPerPage = 60; // 6 colunas x 10 linhas
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
    
    // Carregar lista de instâncias
    loadInstances();
    
    // Configurar eventos
    instanceSelect.addEventListener('change', handleInstanceChange);
    
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
    
    // Fechar modal do carrinho ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
    
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
     * Carrega os dados do trabalhador para exibir no certificado
     */
    function loadWorkerData(instanceId) {
        console.log(`Tentando carregar dados do trabalhador com ID: ${instanceId}`);
        
        // Usar o endpoint específico para instâncias do tipo worker
        const endpoint = `/api/instances/${instanceId}/worker`;  // Atualizado o endpoint
        
        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    console.error(`Erro na resposta da API: ${response.status} ${response.statusText}`);
                    
                    // Se for 404, tentar o endpoint genérico como fallback
                    if (response.status === 404) {
                        console.log('Endpoint específico não encontrado. Tentando endpoint genérico...');
                        return fetch(`/api/instances/${instanceId}`).then(fallbackResponse => {
                            if (!fallbackResponse.ok) {
                                throw new Error(`Erro ao carregar dados: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
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
                
                // Preencher os dados do certificado
                fillWorkerCertificate(data);
                
                // Exibir a seção do certificado
                certificateSection.style.display = 'block';
                
                // Esconder spinner
                loadingSpinner.style.display = 'none';
                
                // Carregar materializações disponíveis para a loja virtual
                loadAvailableMaterializations();
                
                // Carregar histórico de pedidos
                loadOrderHistory(instanceId);
            })
            .catch(error => {
                console.error('Erro detalhado ao carregar dados do trabalhador:', error);
                showError(`Erro ao carregar dados do trabalhador: ${error.message}`);
                loadingSpinner.style.display = 'none';
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
            
            // Participação social
            if (data.estimatedIndividualParticipationInSocialWork !== undefined && 
                data.estimatedIndividualParticipationInSocialWork !== null) {
                const participation = parseFloat(data.estimatedIndividualParticipationInSocialWork);
                socialParticipation.textContent = `ℳ ${participation.toFixed(2)}`;
                
                // Atualizar a variável global para uso na loja
                availableSocialParticipation = participation;
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
        // Mostrar loader
        document.getElementById('ordersLoading').style.display = 'flex';
        document.getElementById('ordersTable').style.display = 'none';
        document.getElementById('emptyOrders').style.display = 'none';
        
        // Simular chamada de API com um atraso
        setTimeout(() => {
            // Como esta é uma API fictícia, vamos gerar dados de exemplo
            // Em uma aplicação real, esta seria uma chamada fetch para a API
            generateMockOrderHistory(instanceId);
            
            // Processar os resultados
            if (orderHistory && orderHistory.length > 0) {
                renderOrderHistory();
                document.getElementById('ordersTable').style.display = 'table';
                document.getElementById('emptyOrders').style.display = 'none';
            } else {
                document.getElementById('emptyOrders').style.display = 'block';
                document.getElementById('ordersTable').style.display = 'none';
            }
            
            // Esconder loader
            document.getElementById('ordersLoading').style.display = 'none';
            
        }, 1500); // Simular um atraso na resposta da API
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
        
        // Gerar entre 0 e 5 pedidos de exemplo
        const orderCount = Math.floor(Math.random() * 6);
        
        for (let i = 0; i < orderCount; i++) {
            // Gerar uma data aleatória nos últimos 30 dias
            const orderDate = new Date(currentDate);
            orderDate.setDate(currentDate.getDate() - Math.floor(Math.random() * 30));
            
            // Gerar entre 1 e 4 itens para o pedido
            const items = [];
            const itemCount = Math.floor(Math.random() * 4) + 1;
            
            let orderTotal = 0;
            
            for (let j = 0; j < itemCount; j++) {
                // Selecionar um produto aleatório da lista de produtos disponíveis
                const randomIndex = Math.floor(Math.random() * allProducts.length);
                const product = allProducts[randomIndex];
                
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
            
            // Gerar um status aleatório
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
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
    
    // Expor funções adicionais globalmente
    window.viewOrderDetails = viewOrderDetails;
});

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
    
    const orderTotal = orderItems.reduce((total, item) => total + item.subtotal, 0);
    
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
        availableSocialParticipation += orderTotal;
        document.getElementById('socialParticipation').textContent = `ℳ ${availableSocialParticipation.toFixed(2)}`;
        
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