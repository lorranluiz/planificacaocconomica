/**
 * Gerenciador de estado do usuário - responsável por lidar com login/logout
 * e exibir informações do usuário no cabeçalho
 */
const UserManager = {
    /**
     * Verifica se o usuário está logado
     * @returns {boolean} true se estiver logado, false caso contrário
     */
    isLoggedIn: function() {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return !!(token && user && user.id);
        } catch (e) {
            console.error('Erro ao verificar status de login:', e);
            return false;
        }
    },
    
    /**
     * Obtém os dados do usuário logado
     * @returns {Object} dados do usuário ou objeto vazio se não estiver logado
     */
    getUserData: function() {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
            console.error('Erro ao obter dados do usuário:', e);
            return {};
        }
    },
    
    /**
     * Faz logout do usuário atual
     */
    logout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },
    
    /**
     * Obtém nome de exibição formatado de acordo com o tipo e pronome do usuário
     * @returns {string} Nome de exibição formatado
     */
    getDisplayName: function() {
        const userData = this.getUserData();
        if (!userData || !userData.name) return '';
        
        let prefix = '';
        if (userData.type === 'COUNCILLOR') {
            if (userData.pronoun === 'SHE_HER') {
                prefix = 'Conselheira ';
            } else if (userData.pronoun === 'HE_HIM') {
                prefix = 'Conselheiro ';
            } else {
                prefix = 'Conselheirx ';
            }
        }
        
        return prefix + userData.name;
    },
    
    /**
     * Atualiza o cabeçalho com base no status de login do usuário
     */
    updateHeader: function() {
        // Verificar se o elemento de login existe
        const loginContainer = document.querySelector('.login-container');
        if (!loginContainer) return;
        
        if (this.isLoggedIn()) {
            const displayName = this.getDisplayName();
            
            // Substituir conteúdo do container de login
            loginContainer.innerHTML = `
                <div class="user-info">
                    <span class="username">${displayName}</span>
                    <button id="logoutBtn" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </button>
                </div>
            `;
            
            // Adicionar evento ao botão de logout
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        } else {
            // Mostrar botão de login se não estiver logado
            loginContainer.innerHTML = `
                <a href="/login.html" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
            `;
        }
        
        // Garantir que os estilos estejam aplicados
        this.ensureStyles();
    },
    
    /**
     * Garante que os estilos necessários estejam presentes
     */
    ensureStyles: function() {
        if (document.getElementById('user-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'user-manager-styles';
        style.textContent = `
            .user-info {
                display: flex;
                align-items: center;
                gap: 15px;
                background-color: var(--card-bg-secondary, #f7f7f7);
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid var(--card-border, #e0e0e0);
            }
            
            .username {
                font-weight: bold;
                color: var(--primary-color-dark, #2c3e50);
                font-size: 0.9rem;
            }
            
            .logout-btn {
                background-color: var(--error-color-light, #e74c3c);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: bold;
                transition: background-color 0.3s;
            }
            
            .logout-btn:hover {
                background-color: var(--error-color, #c0392b);
            }
            
            .login-btn {
                background-color: var(--primary-color-light, #3498db);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                text-decoration: none;
                font-size: 0.9rem;
                font-weight: bold;
                transition: background-color 0.3s;
            }
            
            .login-btn:hover {
                background-color: var(--primary-color, #2980b9);
                text-decoration: none;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Atualizar o cabeçalho quando a página carregar
    UserManager.updateHeader();
});