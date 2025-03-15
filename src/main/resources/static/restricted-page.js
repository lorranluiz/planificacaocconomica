// Script para verificar se o usuário está logado em páginas restritas
document.addEventListener('DOMContentLoaded', function() {
    // Lista de páginas que requerem login
    const restrictedPages = [
        '/instances.html',
        '/social-materializations.html'
    ];
    
    // Verificar se a página atual está na lista de restritas
    function isCurrentPageRestricted() {
        const currentPath = window.location.pathname;
        return restrictedPages.some(page => currentPath.endsWith(page));
    }
    
    // Verificar se o usuário está logado
    function isUserLoggedIn() {
        return localStorage.getItem('currentUser') !== null;
    }
    
    // Redirecionar para login se necessário
    function checkAccessPermission() {
        if (isCurrentPageRestricted() && !isUserLoggedIn()) {
            // Mostrar mensagem de acesso negado
            const container = document.querySelector('.container');
            
            if (container) {
                // Limpar o conteúdo existente
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = '';
                }
                
                // Criar mensagem de acesso negado
                const accessDenied = document.createElement('div');
                accessDenied.className = 'access-denied';
                accessDenied.innerHTML = `
                    <div class="access-denied-content">
                        <i class="fas fa-lock"></i>
                        <h2>Acesso Restrito</h2>
                        <p>Você precisa fazer login para acessar esta página.</p>
                        <button id="login-redirect" class="btn-primary">
                            <i class="fas fa-sign-in-alt"></i> Fazer Login
                        </button>
                    </div>
                `;
                
                container.appendChild(accessDenied);
                
                // Adicionar evento ao botão de login
                document.getElementById('login-redirect').addEventListener('click', function() {
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) {
                        loginModal.style.display = 'block';
                    }
                });
            }
        }
    }
    
    // Adicionar estilos para mensagem de acesso negado
    function addAccessDeniedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .access-denied {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 60vh;
                width: 100%;
            }
            
            .access-denied-content {
                text-align: center;
                padding: 30px;
                background-color: var(--card-bg);
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                max-width: 500px;
            }
            
            .access-denied i {
                font-size: 3rem;
                color: var(--accent-color);
                margin-bottom: 15px;
            }
            
            .access-denied h2 {
                margin-bottom: 15px;
                color: var(--heading-color);
            }
            
            .access-denied p {
                margin-bottom: 25px;
                color: var(--text-color);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Inicializar
    addAccessDeniedStyles();
    checkAccessPermission();
});