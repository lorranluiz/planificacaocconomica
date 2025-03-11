/**
 * Função para inserir o cabeçalho de navegação comum em todas as páginas do sistema
 */
function insertCommonHeader() {
    // Criar o elemento de cabeçalho
    const header = document.createElement('div');
    header.className = 'nav-container';
    header.innerHTML = `
        <div class="logo">
            <a href="/index.html">Sistema de Planejamento Econômico</a>
        </div>
        <div class="nav-links">
            <a href="/index.html" class="${window.location.pathname === '/index.html' || window.location.pathname === '/' ? 'active' : ''}">Início</a>
            <a href="/social-materializations.html" class="${window.location.pathname === '/social-materializations.html' ? 'active' : ''}">Materializações Sociais</a>
            <a href="/instances.html" class="${window.location.pathname === '/instances.html' ? 'active' : ''}">Instâncias</a>
            <a href="/sectors.html" class="${window.location.pathname === '/sectors.html' ? 'active' : ''}">Setores</a>
        </div>
        <div class="user-menu">
            <div id="userInfo" style="display: none;">
                <span id="welcomeUser">Bem-vindo, <strong id="username"></strong></span>
                <button id="logoutBtn" class="btn-small">Sair</button>
            </div>
            <div id="authLinks">
                <a href="/login.html" class="btn-small">Login</a>
            </div>
        </div>
    `;
    
    // Verificar se o container principal existe
    const container = document.querySelector('.container');
    
    if (container) {
        // Inserir no início do container principal
        // Verificar se já existe um cabeçalho para evitar duplicação
        const existingHeader = container.querySelector('.nav-container');
        if (!existingHeader) {
            container.insertBefore(header, container.firstChild);
        }
    } else {
        console.warn('Container não encontrado para inserir o cabeçalho.');
    }
    
    // Verificar se o usuário está logado
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const userInfoElement = document.getElementById('userInfo');
        const authLinksElement = document.getElementById('authLinks');
        
        if (currentUser && userInfoElement && authLinksElement) {
            userInfoElement.style.display = 'flex';
            const usernameElement = document.getElementById('username');
            if (usernameElement) {
                usernameElement.textContent = currentUser.name || currentUser.username || 'Usuário';
            }
            authLinksElement.style.display = 'none';
            
            // Adicionar funcionalidade ao botão de logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                });
            }
        }
    } catch (e) {
        console.error('Erro ao verificar usuário logado:', e);
    }
}

// Modificar a função ensureHeaderStyles para melhorar o contraste dos links
function ensureHeaderStyles() {
    // Verificar se os estilos já existem
    const styleCheck = document.querySelector('style#common-header-styles');
    if (styleCheck) return; // Estilos já existem
    
    // Criar e adicionar os estilos
    const style = document.createElement('style');
    style.id = 'common-header-styles';
    style.textContent = `
        .nav-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--card-border, #e0e0e0);
        }
        
        .logo a {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--primary-color, #2c3e50);
            text-decoration: none;
        }
        
        .nav-links {
            display: flex;
            gap: 15px;
        }
        
        /* Estilo base para links da navegação com melhor contraste */
        .nav-links a {
            color: var(--primary-color, #2c3e50);
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 4px;
            transition: all 0.2s;
            font-weight: 500;
            border: 1px solid transparent;
        }
        
        /* Estado hover com melhor visibilidade */
        .nav-links a:hover {
            background-color: var(--primary-color-light, #3498db);
            color: white;
        }
        
        /* Estado ativo com destaque claro */
        .nav-links a.active {
            background-color: var(--primary-color-light, #3498db);
            color: white;
            font-weight: 600;
        }
        
        /* Ajustes específicos para o tema Night */
        [data-theme="night"] .nav-links a {
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        [data-theme="night"] .nav-links a:hover,
        [data-theme="night"] .nav-links a.active {
            background-color: var(--primary-color-light, #64b5f6);
            color: #121212;
            border-color: var(--primary-color-light, #64b5f6);
        }
        
        /* Ajustes para temas coloridos */
        [data-theme="sunlight"] .nav-links a {
            color: #4e342e;
            font-weight: 600;
        }
        
        [data-theme="bolchevick"] .nav-links a {
            color: #3e2723;
            font-weight: 600;
        }
        
        [data-theme="sunlight"] .nav-links a:hover,
        [data-theme="sunlight"] .nav-links a.active,
        [data-theme="bolchevick"] .nav-links a:hover,
        [data-theme="bolchevick"] .nav-links a.active {
            color: white;
        }
        
        .user-menu {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        #userInfo {
            display: none;
            align-items: center;
            gap: 10px;
        }
        
        .btn-small {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            border: none;
            cursor: pointer;
            background-color: var(--primary-color-light, #3498db);
            color: white;
            text-decoration: none;
            font-weight: 500;
        }
        
        .btn-small:hover {
            background-color: var(--primary-color-dark, #2980b9);
        }
        
        /* Responsividade para dispositivos móveis */
        @media (max-width: 768px) {
            .nav-container {
                flex-direction: column;
                gap: 10px;
            }
            
            .nav-links {
                width: 100%;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .user-menu {
                margin-top: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Executar verificação de estilos quando o script carrega
ensureHeaderStyles();

// Expor a função globalmente
window.insertCommonHeader = insertCommonHeader;