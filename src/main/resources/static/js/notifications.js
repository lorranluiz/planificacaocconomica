/**
 * Sistema de notificações para fornecer feedback ao usuário
 */

// Criar container de notificações se não existir
function createNotificationContainer() {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Mostra uma notificação
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - O tipo de notificação ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duração em milissegundos (padrão: 5000ms)
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = createNotificationContainer();
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Determinar ícone com base no tipo
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    // Criar conteúdo da notificação
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <div class="notification-close" onclick="this.parentElement.remove()">&times;</div>
    `;
    
    // Adicionar ao container
    container.appendChild(notification);
    
    // Exibir notificação com animação
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remover após a duração especificada
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    return notification;
}

/**
 * Alias para tipos comuns de notificação
 */
function showSuccessMessage(message, duration = 5000) {
    return showNotification(message, 'success', duration);
}

function showErrorMessage(message, duration = 8000) {
    return showNotification(message, 'error', duration);
}

function showInfoMessage(message, duration = 5000) {
    return showNotification(message, 'info', duration);
}

function showWarningMessage(message, duration = 7000) {
    return showNotification(message, 'warning', duration);
}

/**
 * Processa erros HTTP e exibe uma notificação apropriada
 * @param {Response} response - O objeto de resposta HTTP 
 * @returns {Promise} - Rejeita com o erro processado
 */
async function handleHttpError(response) {
    let errorMessage = `Erro ${response.status}: ${response.statusText}`;
    
    // Tentar extrair mensagem de erro detalhada do corpo da resposta
    try {
        const errorData = await response.json();
        if (errorData.message) {
            errorMessage = errorData.message;
        }
    } catch (e) {
        // Se não conseguir extrair JSON, tentar texto simples
        try {
            const errorText = await response.text();
            if (errorText && errorText.length < 200) {
                errorMessage = errorText;
            }
        } catch (textError) {
            // Manter mensagem original
        }
    }
    
    // Mostrar notificação de erro
    showErrorMessage(errorMessage);
    
    // Criar um erro com a mensagem processada
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = response;
    
    throw error;
}
