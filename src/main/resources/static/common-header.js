/**
 * Sistema de tema global e gerenciamento de cabeçalho comum
 * Esta implementação garante persistência de tema entre páginas
 */

// -------------------- SISTEMA DE TEMA --------------------

// Aplicar tema imediatamente quando script é carregado
(function() {
    try {
        const savedTheme = localStorage.getItem('preferredTheme') || 'ocean';
        applyThemeToEntirePage(savedTheme);
        console.log('Tema inicial aplicado:', savedTheme);
    } catch (e) {
        console.error('Erro ao aplicar tema inicial:', e);
    }
})();

/**
 * Aplica o tema diretamente à página
 * @param {string} theme - Nome do tema a ser aplicado
 */
function applyThemeToPage(theme) {
    console.log(`Aplicando tema ${theme} à página`);
    
    // 1. Aplicar ao elemento raiz como atributo data-theme
    document.documentElement.setAttribute('data-theme', theme);
    
    // 2. Armazenar no localStorage para persistência
    localStorage.setItem('preferredTheme', theme);
    
    // 3. Aplicar como classe ao body também (método alternativo)
    const bodyClasses = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
    document.body.className = [...bodyClasses, `theme-${theme}`].join(' ');
    
    // 4. Forçar repintagem do DOM para garantir aplicação do tema
    document.documentElement.style.display = 'none';
    // Esta linha força o navegador a recalcular os estilos
    void document.documentElement.offsetHeight;
    document.documentElement.style.display = '';
    
    // 5. Disparar evento personalizado para outras partes do código
    document.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme } 
    }));
    
    return true;
}

// Adicione esta função global para aplicação do tema
function applyThemeToEntirePage(theme) {
    console.log(`Aplicando tema ${theme} globalmente em toda a página`);
    
    // 1. Aplicar ao documento HTML
    document.documentElement.setAttribute('data-theme', theme);
    
    // 2. Salvar no localStorage
    localStorage.setItem('preferredTheme', theme);
    
    // 3. Adicionar classe ao body
    document.body.className = document.body.className
        .replace(/theme-ocean|theme-night|theme-sunlight|theme-bolchevick/g, '')
        .trim();
    document.body.classList.add('theme-' + theme);
    
    // 4. Aplicar a todos os iframes (se existirem)
    document.querySelectorAll('iframe').forEach(iframe => {
        try {
            iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
        } catch(e) {
            // Ignora erros de cross-origin
        }
    });
    
    // 5. Forçar repintagem do DOM para garantir aplicação imediata
    document.documentElement.style.display = 'none';
    void document.documentElement.offsetHeight;
    document.documentElement.style.display = '';
    
    // 6. Disparar evento de mudança de tema
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme }
    }));
    
    console.log(`Tema ${theme} aplicado globalmente com sucesso`);
    
    // ADICIONAR esta linha para garantir que os estilos do cabeçalho sejam reaplicados
    if (typeof ensureHeaderStyles === 'function') {
        ensureHeaderStyles();
    }
    
    return true;
}

// -------------------- CABEÇALHO COMUM --------------------

/**
 * Insere o cabeçalho comum em todas as páginas do sistema
 */
function insertCommonHeader() {
    // Primeiro aplicar o tema
    const savedTheme = localStorage.getItem('preferredTheme') || 'ocean';
    applyThemeToEntirePage(savedTheme);
    
    // Verificar se o cabeçalho já existe para evitar duplicação
    if (document.querySelector('.nav-container')) {
        console.log('Cabeçalho já existe, pulando inserção');
        return;
    }
    
    // Criar elemento de cabeçalho
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
            <a href="/users.html" class="${window.location.pathname === '/users.html' ? 'active' : ''}">Usuários</a>
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
    
    // Inserir cabeçalho no container principal
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(header, container.firstChild);
    } else {
        console.warn('Container não encontrado para inserir o cabeçalho');
    }
    
    // Verificar se usuário está logado
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            const userInfoElement = document.getElementById('userInfo');
            const authLinksElement = document.getElementById('authLinks');
            const usernameElement = document.getElementById('username');
            
            if (userInfoElement && authLinksElement && usernameElement) {
                userInfoElement.style.display = 'flex';
                usernameElement.textContent = currentUser.name || currentUser.username || 'Usuário';
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
        }
    } catch (e) {
        console.error('Erro ao verificar usuário logado:', e);
    }
    
    // Adicionar seletor de tema DEPOIS de inserir o cabeçalho
    setTimeout(addThemeSelector, 0);
    
    // Garantir estilos do cabeçalho
    ensureHeaderStyles();
    
    // Após inserir o cabeçalho, atualizar o botão de login/logout
    updateLoginLogoutButton();
}

// -------------------- SELETOR DE TEMA --------------------

// Função para adicionar o seletor de tema
function addThemeSelector() {
    // Verificar se o seletor já existe para evitar duplicação
    if (document.querySelector('#themeSelector')) {
        console.log("Seletor de tema já existe, pulando criação");
        return;
    }
    
    console.log("Adicionando seletor de tema à página");
    
    // Criar o elemento
    const themeSelector = document.createElement('div');
    themeSelector.id = 'themeSelector';
    themeSelector.className = 'theme-selector';
    themeSelector.innerHTML = `
        <button id="themeToggleBtn" class="theme-toggle-btn">
            <i class="fas fa-palette"></i> Tema
        </button>
        <div id="themeMenu" class="theme-menu">
            <div class="theme-option" data-theme="ocean">
                <span class="theme-preview ocean-preview"></span>
                <span class="theme-name">Ocean</span>
            </div>
            <div class="theme-option" data-theme="night">
                <span class="theme-preview night-preview"></span>
                <span class="theme-name">Night</span>
            </div>
            <div class="theme-option" data-theme="sunlight">
                <span class="theme-preview sunlight-preview"></span>
                <span class="theme-name">Sunlight</span>
            </div>
            <div class="theme-option" data-theme="bolchevick">
                <span class="theme-preview bolchevick-preview"></span>
                <span class="theme-name">Bolchevick</span>
            </div>
        </div>
    `;
    
    // Adicionar à página na posição correta (mesma de index.html)
    const container = document.querySelector('.container');
    if (container) {
        // Adicionar como primeiro elemento do container
        container.insertAdjacentElement('afterbegin', themeSelector);
    }
    
    // Adicionar estilos específicos sempre
    addThemeSelectorStyles();
    
    // Configurar eventos DEPOIS de adicionar ao DOM
    setTimeout(setupThemeEvents, 0);
}

// NOVA FUNÇÃO: Adicionar estilos do seletor de tema
function addThemeSelectorStyles() {
    // Se já existem os estilos, não adicionar novamente
    if (document.getElementById('theme-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'theme-selector-styles';
    style.textContent = `
        .theme-selector {
            position: absolute;
            right: 20px;
            top: 20px;
            z-index: 1000;
        }
        
        .theme-toggle-btn {
            background-color: rgba(0, 0, 0, 0.1);
            border: none;
            color: var(--text-color, #333);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
        }
        
        .theme-toggle-btn:hover {
            background-color: rgba(0, 0, 0, 0.2);
        }
        
        [data-theme="night"] .theme-toggle-btn {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
        }
        
        [data-theme="night"] .theme-toggle-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .theme-menu {
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 5px;
            background-color: var(--card-bg, #ffffff);
            border: 1px solid var(--card-border, rgba(0,0,0,0.1));
            border-radius: 4px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.16);
            width: 200px;
            z-index: 1100;
            display: none;
        }
        
        .theme-option {
            padding: 10px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .theme-option:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        [data-theme="night"] .theme-option:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .theme-preview {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .ocean-preview {
            background: linear-gradient(135deg, #2c3e50, #3498db);
        }
        
        .night-preview {
            background: linear-gradient(135deg, #1a1a1a, #444444);
        }
        
        .sunlight-preview {
            background: linear-gradient(135deg, #ff7e00, #ffb74d);
        }
        
        .bolchevick-preview {
            background: linear-gradient(135deg, #c62828, #ef5350);
        }
        
        .theme-name {
            color: var(--text-color, #333);
            font-weight: 500;
        }
        
        [data-theme="night"] .theme-name {
            color: white;
        }
        
        @media (max-width: 768px) {
            .theme-selector {
                position: relative;
                top: 0;
                right: 0;
                margin: 10px auto;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(style);
}

// Substituir a função setupThemeEvents
function setupThemeEvents() {
    console.log("Configurando eventos do seletor de tema");
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeMenu = document.getElementById('themeMenu');
    
    if (!themeToggleBtn || !themeMenu) {
        console.error("Botão de toggle ou menu de temas não encontrado");
        return;
    }
    
    // Abrir/fechar menu
    themeToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Clique no botão de tema");
        themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
    });
    
    // Configurar eventos para cada opção de tema
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Obter o tema selecionado
            const theme = this.getAttribute('data-theme');
            console.log(`Tema selecionado: ${theme}`);
            
            // Aplicar o tema à página inteira
            applyThemeToEntirePage(theme);
            
            // Fechar o menu
            themeMenu.style.display = 'none';
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function() {
        if (themeMenu) themeMenu.style.display = 'none';
    });
    
    console.log("Eventos do seletor de tema configurados com sucesso");
}

// Função para alternar visibilidade do menu de temas
function toggleThemeMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const themeMenu = document.getElementById('themeMenu');
    if (themeMenu) {
        themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
    }
}

// Função para fechar o menu de temas
function closeThemeMenu() {
    const themeMenu = document.getElementById('themeMenu');
    if (themeMenu) {
        themeMenu.style.display = 'none';
    }
}

// Handler para clique nas opções de tema
function themeOptionClickHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Obter tema selecionado
    const theme = this.getAttribute('data-theme');
    if (!theme) return;
    
    // Aplicar tema
    applyThemeToPage(theme);
    
    // Fechar menu
    const themeMenu = document.getElementById('themeMenu');
    if (themeMenu) {
        themeMenu.style.display = 'none';
    }
    
    // Log para debug
    console.log(`Tema ${theme} aplicado via clique no seletor`);
}

// -------------------- ESTILOS CSS --------------------

/**
 * Adiciona os estilos para o seletor de tema
 */
function addThemeSelectorStyles() {
    if (document.getElementById('theme-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'theme-selector-styles';
    style.textContent = `
        .theme-selector {
            position: absolute;
            right: 20px;
            top: 20px;
            z-index: 1000;
        }
        
        .theme-toggle-btn {
            background-color: rgba(0, 0, 0, 0.1);
            border: none;
            color: var(--text-color, #333);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
        }
        
        .theme-toggle-btn:hover {
            background-color: rgba(0, 0, 0, 0.2);
        }
        
        .theme-menu {
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 5px;
            background-color: var(--card-bg, #ffffff);
            border: 1px solid var(--card-border, rgba(0,0,0,0.1));
            border-radius: 4px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.16);
            width: 200px;
            z-index: 1100;
            display: none;
        }
        
        .theme-option {
            padding: 10px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .theme-option:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        [data-theme="night"] .theme-option:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .theme-preview {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .ocean-preview {
            background: linear-gradient(135deg, #2c3e50, #3498db);
        }
        
        .night-preview {
            background: linear-gradient(135deg, #1a1a1a, #444444);
        }
        
        .sunlight-preview {
            background: linear-gradient(135deg, #ff7e00, #ffb74d);
        }
        
        .bolchevick-preview {
            background: linear-gradient(135deg, #c62828, #ef5350);
        }
        
        .theme-name {
            color: var(--text-color, #333);
            font-weight: 500;
        }
        
        /* Night tema específico */
        [data-theme="night"] .theme-toggle-btn {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        [data-theme="night"] .theme-toggle-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        [data-theme="night"] .theme-name {
            color: white;
        }
        
        /* Responsivo */
        @media (max-width: 768px) {
            .theme-selector {
                position: relative;
                top: 0;
                right: 0;
                margin: 10px auto;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Adiciona os estilos para o cabeçalho comum
 */
function ensureHeaderStyles() {
    if (document.getElementById('common-header-styles')) {
        // Remover os estilos anteriores para garantir atualização
        const oldStyles = document.getElementById('common-header-styles');
        oldStyles.parentNode.removeChild(oldStyles);
    }
    
    const style = document.createElement('style');
    style.id = 'common-header-styles';
    style.textContent = `
        .nav-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--card-border, #e0e0e0);
            background-color: var(--card-bg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .logo a {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--primary-color, #2c3e50);
            text-decoration: none;
            text-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        
        .nav-links {
            display: flex;
            gap: 12px;
        }
        
        /* MELHORADO: Alto contraste para links de navegação no estado padrão */
        .nav-links a {
            color: var(--text-color, #333) !important;
            background-color: #f0f0f0 !important;
            text-decoration: none !important;
            padding: 10px 16px !important;
            border-radius: 6px !important;
            transition: all 0.25s ease !important;
            font-weight: 600 !important;
            border: 2px solid rgba(0,0,0,0.1) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            display: inline-block !important;
            text-align: center !important;
            position: relative !important;
            overflow: hidden !important;
        }
        
        /* MELHORADO: Estado hover com alto contraste e efeitos visuais */
        .nav-links a:hover {
            background-color: var(--primary-color-light, #3498db) !important;
            color: white !important;
            border-color: var(--primary-color-dark, #2980b9) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
        }
        
        /* MELHORADO: Estado ativo com destaque muito evidente */
        .nav-links a.active {
            background-color: var(--primary-color, #2c3e50) !important;
            color: white !important;
            font-weight: 700 !important;
            border-color: var(--primary-color-dark, #1a252f) !important;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1) !important;
            transform: translateY(0) !important;
        }
        
        /* TEMA OCEAN: Ajustes específicos para tema padrão */
        [data-theme="ocean"] .nav-links a {
            color: #2c3e50 !important;
            background-color: rgba(236, 240, 245, 0.9) !important;
            border-color: #bdc3c7 !important;
        }
        
        [data-theme="ocean"] .nav-links a:hover {
            background-color: #3498db !important;
            color: white !important;
            border-color: #2980b9 !important;
        }
        
        [data-theme="ocean"] .nav-links a.active {
            background-color: #2c3e50 !important;
            color: white !important;
            border-color: #1a252f !important;
        }
        
        /* TEMA NIGHT: Ajustes para maior contraste no tema escuro */
        [data-theme="night"] .nav-links a {
            color: white !important;
            background-color: #2c2c2c !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
        }
        
        [data-theme="night"] .nav-links a:hover {
            background-color: #64b5f6 !important;
            color: #121212 !important;
            border-color: #4299e1 !important;
        }
        
        [data-theme="night"] .nav-links a.active {
            background-color: #90caf9 !important;
            color: #121212 !important;
            border-color: #42a5f5 !important;
            font-weight: 700 !important;
        }
        
        /* TEMA SUNLIGHT: Ajustes para tema claro com maior contraste */
        [data-theme="sunlight"] .nav-links a {
            color: #4e342e !important;
            background-color: #fff3e0 !important;
            border-color: #ffcc80 !important;
            font-weight: 600 !important;
        }
        
        [data-theme="sunlight"] .nav-links a:hover {
            background-color: #ff9800 !important;
            color: white !important;
            border-color: #f57c00 !important;
        }
        
        [data-theme="sunlight"] .nav-links a.active {
            background-color: #ff7e00 !important;
            color: white !important;
            border-color: #e65100 !important;
        }
        
        /* TEMA BOLCHEVICK: Ajustes para tema vermelho com maior contraste */
        [data-theme="bolchevick"] .nav-links a {
            color: #3e2723 !important;
            background-color: #ffebee !important;
            border-color: #ef9a9a !important;
            font-weight: 600 !important;
        }
        
        [data-theme="bolchevick"] .nav-links a:hover {
            background-color: #ef5350 !important;
            color: white !important;
            border-color: #d32f2f !important;
        }
        
        [data-theme="bolchevick"] .nav-links a.active {
            background-color: #c62828 !important;
            color: white !important;
            border-color: #b71c1c !important;
        }
        
        /* MELHORADO: Estilo do botão Login/Logout para maior contraste */
        .btn-small, .user-menu a.btn-small {
            padding: 8px 15px !important;
            border-radius: 6px !important;
            font-size: 14px !important;
            border: none !important;
            cursor: pointer !important;
            background-color: var(--primary-color-light, #3498db) !important;
            color: white !important;
            text-decoration: none !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            transition: all 0.25s ease !important;
            display: inline-block !important;
        }
        
        .btn-small:hover, .user-menu a.btn-small:hover {
            background-color: var(--primary-color-dark, #2980b9) !important;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3) !important;
            transform: translateY(-1px) !important;
        }
        
        .btn-small:active, .user-menu a.btn-small:active {
            transform: translateY(1px) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
        }
        
        /* ESPECÍFICO POR TEMA: Botão Login/Logout */
        [data-theme="night"] .btn-small, [data-theme="night"] .user-menu a.btn-small {
            background-color: #64b5f6 !important;
            color: #121212 !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
        }
        
        [data-theme="night"] .btn-small:hover, [data-theme="night"] .user-menu a.btn-small:hover {
            background-color: #90caf9 !important;
        }
        
        [data-theme="sunlight"] .btn-small, [data-theme="sunlight"] .user-menu a.btn-small {
            background-color: #ff9800 !important;
            color: white !important;
        }
        
        [data-theme="sunlight"] .btn-small:hover, [data-theme="sunlight"] .user-menu a.btn-small:hover {
            background-color: #f57c00 !important;
        }
        
        [data-theme="bolchevick"] .btn-small, [data-theme="bolchevick"] .user-menu a.btn-small {
            background-color: #ef5350 !important;
            color: white !important;
        }
        
        [data-theme="bolchevick"] .btn-small:hover, [data-theme="bolchevick"] .user-menu a.btn-small:hover {
            background-color: #d32f2f !important;
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
        
        #welcomeUser {
            color: var(--text-color) !important;
            font-weight: 500 !important;
        }
        
        /* Responsividade para dispositivos móveis */
        @media (max-width: 768px) {
            .nav-container {
                flex-direction: column;
                gap: 15px;
                padding: 10px;
            }
            
            .nav-links {
                width: 100%;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
            }
            
            .nav-links a {
                min-width: 110px;
                text-align: center;
                padding: 8px 10px !important;
            }
            
            .user-menu {
                margin-top: 10px;
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Forçar a reavaliação dos estilos
    void document.documentElement.offsetHeight;
    
    // Verificar se o tema atual tem suas regras específicas aplicadas
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'ocean';
    console.log(`Estilos de cabeçalho aplicados/atualizados para tema: ${currentTheme}`);
}

// -------------------- FUNÇÕES EXPOSTAS GLOBALMENTE --------------------

// Verificação de integridade do tema
function verifyTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = localStorage.getItem('preferredTheme') || 'ocean';
    
    console.log(`Verificando tema: atual=${currentTheme}, salvo=${savedTheme}`);
    
    if (currentTheme !== savedTheme) {
        console.warn(`Tema inconsistente! DOM: ${currentTheme}, LocalStorage: ${savedTheme}`);
        applyThemeToEntirePage(savedTheme);
        return false;
    }
    
    // Garantir que o tema esteja aplicado corretamente
    applyThemeToEntirePage(savedTheme);
    
    console.log(`Verificação de tema: OK (${currentTheme})`);
    return true;
}

// Expor funções necessárias globalmente
window.insertCommonHeader = insertCommonHeader;
window.applyThemeDirectly = applyThemeDirectly;  // Expor para acesso direto se necessário
window.verifyTheme = verifyTheme;
window.applyThemeToEntirePage = applyThemeToEntirePage;

// Auto-execução para garantir que o tema seja aplicado imediatamente
(function() {
    const savedTheme = localStorage.getItem('preferredTheme') || 'ocean';
    applyThemeToEntirePage(savedTheme);
})();

// Função para atualizar estado de login/logout no cabeçalho
function updateLoginLogoutButton() {
    const loginLogoutBtn = document.getElementById('loginLogoutBtn');
    if (!loginLogoutBtn) return;
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.id) {
        // Usuário está logado
        loginLogoutBtn.textContent = 'Minha Conta';
        loginLogoutBtn.classList.add('logged-in');
        
        // Alterar comportamento do botão (via modificação do onclick)
        loginLogoutBtn.onclick = function(e) {
            e.preventDefault();
            window.location.href = '/login.html';
        };
    } else {
        // Usuário não está logado
        loginLogoutBtn.textContent = 'Login';
        loginLogoutBtn.classList.remove('logged-in');
        
        // Restaurar comportamento padrão do link
        loginLogoutBtn.onclick = null;
    }
}

// Chamada inicial quando o script é carregado
document.addEventListener('DOMContentLoaded', function() {
    if (typeof insertCommonHeader === 'function') {
        insertCommonHeader();
    }
});