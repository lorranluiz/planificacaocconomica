/**
 * Sistema de tema global e gerenciamento de cabeçalho comum
 * Esta implementação garante persistência de tema entre páginas
 */

// -------------------- SISTEMA DE TEMA --------------------

// Aplicar tema imediatamente quando script é carregado
(function() {
    try {
        // Verificar se o DOM já está carregado
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            const savedTheme = localStorage.getItem('preferredTheme') || 'night';
            applyThemeToEntirePage(savedTheme);
        } else {
            // Se não estiver, aguardar o evento DOMContentLoaded
            document.addEventListener('DOMContentLoaded', function() {
                const savedTheme = localStorage.getItem('preferredTheme') || 'night';
                applyThemeToEntirePage(savedTheme);
            });
        }
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
    
    // 3. Adicionar classe ao body - VERIFICAÇÃO DE NULL ADICIONADA
    if (document.body) {
        document.body.className = document.body.className
            .replace(/theme-ocean|theme-night|theme-sunlight|theme-bolchevick/g, '')
            .trim();
        document.body.classList.add('theme-' + theme);
    }
    
    // 4. Aplicar a todos os iframes (se existirem)
    if (document.querySelectorAll) {
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
            } catch(e) {
                // Ignora erros de cross-origin
            }
        });
    }
    
    // 5. Forçar repintagem do DOM apenas se o body existir
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
        void document.documentElement.offsetHeight;
        document.documentElement.style.display = '';
    }
    
    // 6. Disparar evento de mudança de tema
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme }
    }));
    
    console.log(`Tema ${theme} aplicado globalmente com sucesso`);
    
    // ADICIONAR esta linha para garantir que os estilos do cabeçalho sejam reaplicados
    if (typeof ensureHeaderStyles === 'function' && document.body) {
        ensureHeaderStyles();
    }
    
    return true;
}

// -------------------- CABEÇALHO COMUM --------------------

/**
 * Insere o cabeçalho comum em todas as páginas do sistema
 */
// Flag global para controlar se o header já foi inserido
let headerInserted = false;

function insertCommonHeader() {
    console.log('=== insertCommonHeader() chamado ===');
    console.log('headerInserted flag:', headerInserted);
    console.log('Existe .nav-container?', !!document.querySelector('.nav-container'));
    console.log('Existe .main-header?', !!document.querySelector('.main-header'));
    
    // Verificar flag global primeiro
    if (headerInserted) {
        console.log('Cabeçalho já foi inserido (flag global), pulando inserção');
        return;
    }
    
    // Verificar se o cabeçalho já existe no DOM
    if (document.querySelector('.nav-container') || document.querySelector('.main-header')) {
        console.log('Cabeçalho já existe no DOM, pulando inserção');
        headerInserted = true;
        return;
    }
    
    // Marcar como inserido IMEDIATAMENTE para evitar race conditions
    headerInserted = true;
    console.log('Inserindo cabeçalho...');
    
    // Primeiro aplicar o tema
    const savedTheme = localStorage.getItem('preferredTheme') || 'night';
    applyThemeToEntirePage(savedTheme);
    
    // Adicionar estilos do header
    addHeaderStyles();
    
    // Criar elemento de cabeçalho
    const header = document.createElement('div');
    header.className = 'nav-container';
    header.innerHTML = `
        <div class="nav-top-row">
            <div class="logo">
                <a href="/index.html">Sistema de Planejamento Econômico</a>
            </div>
            <button class="nav-menu-toggle" aria-label="Menu de navegação">
                <i class="fas fa-bars"></i>
            </button>
            <div class="user-menu">
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
                <div id="userInfo" style="display: none;">
                    <span id="welcomeUser">Bem-vindo, <strong id="username"></strong></span>
                    <button id="logoutBtn" class="btn-small">Sair</button>
                </div>
                <div id="authLinks">
                    <button id="headerLoginBtn" class="login-button btn-small" onclick="loginButtonClick(event); return false;">Login</button>
                </div>
            </div>
        </div>
        <div class="nav-links-container">
            <div class="nav-links">
                <a href="/index.html" class="${window.location.pathname === '/index.html' || window.location.pathname === '/' ? 'active' : ''}"><i class="fas fa-home"></i> Início</a>
                <a href="/social-materializations.html" class="${window.location.pathname === '/social-materializations.html' ? 'active' : ''}"><i class="fas fa-cubes"></i> Materializações</a>
                <a href="/instances.html" class="${window.location.pathname === '/instances.html' ? 'active' : ''}"><i class="fas fa-sitemap"></i> Instâncias</a>
                <a href="/sectors.html" class="${window.location.pathname === '/sectors.html' ? 'active' : ''}"><i class="fas fa-layer-group"></i> Setores</a>
                <a href="/users.html" class="${window.location.pathname === '/users.html' ? 'active' : ''}"><i class="fas fa-users"></i> Usuários</a>
                <a href="/technological-tensors.html" class="${window.location.pathname === '/technological-tensors.html' ? 'active' : ''}"><i class="fas fa-atom"></i> Tensores</a>
                <a href="/workers-proposals.html" class="${window.location.pathname === '/workers-proposals.html' ? 'active' : ''}"><i class="fas fa-users-cog"></i> Propostas</a>
                <a href="/demand-stocks.html" class="${window.location.pathname === '/demand-stocks.html' ? 'active' : ''}"><i class="fas fa-boxes"></i> Estoque</a>
                <a href="/demand-vectors.html" class="${window.location.pathname === '/demand-vectors.html' ? 'active' : ''}"><i class="fas fa-project-diagram"></i> Vetores</a>
            </div>
        </div>
    `;
    
    // Inserir cabeçalho no container principal
    const container = document.querySelector('.container');
    console.log('Container encontrado:', container ? 'SIM' : 'NÃO');
    if (container) {
        container.insertBefore(header, container.firstChild);
        console.log('Cabeçalho inserido com sucesso no container');
    } else {
        console.warn('Container não encontrado para inserir o cabeçalho');
        // Tentar inserir no body como fallback
        document.body.insertBefore(header, document.body.firstChild);
        console.log('Cabeçalho inserido no body (fallback)');
    }
    
    // Configurar botão de menu mobile
    const menuToggle = header.querySelector('.nav-menu-toggle');
    const navLinksContainer = header.querySelector('.nav-links-container');
    
    if (menuToggle && navLinksContainer) {
        // Verificar tamanho da tela e aplicar estado correto inicialmente
        function checkScreenSize() {
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('visible');
                navLinksContainer.style.display = 'none';
            } else {
                navLinksContainer.style.display = 'block';
            }
        }
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        menuToggle.addEventListener('click', function() {
            navLinksContainer.classList.toggle('visible');
            
            if (navLinksContainer.classList.contains('visible')) {
                navLinksContainer.style.display = 'block';
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-times';
            } else {
                navLinksContainer.style.display = 'none';
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });
    }
    
    // Configurar seletor de tema
    setupThemeEvents();
    
    // Garantir estilos do cabeçalho e tema
    ensureHeaderStyles();
    addThemeSelectorStyles();
    ensureThemeMenuStyles();  // Adicionar esta linha
    
    // Configurar seletor de tema
    setTimeout(setupThemeEvents, 100);  // Aumentar o timeout para garantir que DOM esteja pronto
    
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

// NOVA FUNÇÃO: Adicionar estilos do header
function addHeaderStyles() {
    if (document.getElementById('header-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'header-styles';
    style.textContent = `
        /* Container principal do header */
        .nav-container {
            background: var(--primary-color, #2c3e50) !important;
            color: var(--header-text, white) !important;
            padding: 1rem 2rem !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15) !important;
            margin: -20px -20px 20px -20px !important;
            border-bottom: 3px solid var(--primary-color-light, #3498db) !important;
            transition: all 0.3s ease !important;
        }
        
        [data-theme="night"] .nav-container {
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.5) !important;
        }
        
        /* Linha superior (logo + toggle + menu usuário) */
        .nav-top-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            margin-bottom: 1rem !important;
            gap: 1rem !important;
        }
        
        /* Logo */
        .nav-container .logo {
            flex: 1 !important;
            min-width: 200px !important;
        }
        
        .nav-container .logo a {
            color: var(--header-text, white) !important;
            text-decoration: none !important;
            font-size: 1.4rem !important;
            font-weight: 600 !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            transition: all 0.3s !important;
            display: inline-block !important;
        }
        
        .nav-container .logo a:hover {
            color: var(--primary-color-light, #3498db) !important;
            transform: translateY(-1px) !important;
        }
        
        /* Toggle de menu mobile */
        .nav-menu-toggle {
            display: none !important;
            background: var(--primary-color-dark, #1f2d3d) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            padding: 0.6rem 0.8rem !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 1.2rem !important;
            transition: all 0.3s !important;
        }
        
        .nav-menu-toggle:hover {
            background: var(--primary-color-light, #3498db) !important;
            transform: scale(1.05) !important;
        }
        
        /* Menu do usuário */
        .user-menu {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            flex-wrap: wrap !important;
        }
        
        /* Botão de toggle do tema */
        .theme-toggle-btn {
            background: var(--primary-color-dark, #1f2d3d) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            padding: 0.6rem 1rem !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 0.9rem !important;
            font-weight: 500 !important;
            transition: all 0.3s !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
        }
        
        .theme-toggle-btn:hover {
            background: var(--primary-color-light, #3498db) !important;
            border-color: rgba(255, 255, 255, 0.4) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        }
        
        .theme-toggle-btn i {
            font-size: 1rem !important;
        }
        
        /* Botão de login */
        .login-button {
            background: var(--primary-color-light, #3498db) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            color: white !important;
            padding: 0.6rem 1rem !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 0.9rem !important;
            font-weight: 500 !important;
            transition: all 0.3s !important;
        }
        
        .login-button:hover {
            background: var(--primary-color-dark, #2c3e50) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        }
        
        /* Info do usuário */
        #userInfo {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            color: var(--header-text, white) !important;
            font-size: 0.9rem !important;
        }
        
        #userInfo strong {
            color: var(--primary-color-light, #3498db) !important;
        }
        
        #logoutBtn {
            background: var(--error-color, #e74c3c) !important;
            border: none !important;
            padding: 0.5rem 0.9rem !important;
        }
        
        #logoutBtn:hover {
            background: darkred !important;
        }
        
        /* Container dos links de navegação */
        .nav-links-container {
            width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }
        
        .nav-links-container::-webkit-scrollbar {
            height: 4px !important;
        }
        
        .nav-links-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3) !important;
            border-radius: 4px !important;
        }
        
        .nav-links-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Links de navegação */
        .nav-links {
            display: flex !important;
            gap: 0.5rem !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
        }
        
        .nav-links a {
            color: rgba(255, 255, 255, 0.9) !important;
            text-decoration: none !important;
            padding: 0.6rem 1rem !important;
            border-radius: 4px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            transition: all 0.3s !important;
            font-size: 0.9rem !important;
            font-weight: 500 !important;
            border: 1px solid transparent !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
        
        .nav-links a:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            color: white !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            transform: translateY(-1px) !important;
        }
        
        .nav-links a.active {
            background: var(--primary-color-light, #3498db) !important;
            color: white !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
        }
        
        .nav-links a i {
            font-size: 1rem !important;
        }
        
        /* Responsivo - Mobile */
        @media (max-width: 768px) {
            .nav-container {
                padding: 0.75rem 1rem !important;
                margin: -20px -20px 15px -20px !important;
            }
            
            .nav-top-row {
                margin-bottom: 0.75rem !important;
            }
            
            .nav-container .logo a {
                font-size: 1.1rem !important;
            }
            
            .nav-menu-toggle {
                display: inline-flex !important;
            }
            
            .nav-links {
                flex-direction: column !important;
                gap: 0.5rem !important;
            }
            
            .nav-links a {
                width: 100% !important;
                justify-content: flex-start !important;
            }
            
            .user-menu {
                width: 100% !important;
                justify-content: flex-end !important;
            }
        }
    `;
    document.head.appendChild(style);
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
    
    // Remover eventos antigos para evitar duplicação
    const oldToggleBtn = document.getElementById('themeToggleBtn');
    if (oldToggleBtn) {
        const newToggleBtn = oldToggleBtn.cloneNode(true);
        oldToggleBtn.parentNode.replaceChild(newToggleBtn, oldToggleBtn);
    }
    
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
        
        // Forçar z-index alto para garantir que apareça na frente
        themeMenu.style.zIndex = "9999";
        
        // Verificar posição correta
        const btnRect = themeToggleBtn.getBoundingClientRect();
        themeMenu.style.position = "absolute";
        themeMenu.style.top = (btnRect.bottom + 5) + "px";
        themeMenu.style.right = "0";
        
        // Alternar visibilidade
        if (themeMenu.style.display === 'block') {
            themeMenu.style.display = 'none';
        } else {
            themeMenu.style.display = 'block';
        }
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
    document.addEventListener('click', function(e) {
        // Verificar se o clique não foi no botão ou no menu
        if (themeMenu && 
            e.target !== themeToggleBtn && 
            !themeToggleBtn.contains(e.target) && 
            e.target !== themeMenu &&
            !themeMenu.contains(e.target)) {
            themeMenu.style.display = 'none';
        }
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
            flex-direction: column;
            padding: 15px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--card-border, #e0e0e0);
            background-color: var(--card-bg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .nav-top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            width: 100%;
        }
        
        .logo a {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--primary-color, #2c3e50);
            text-decoration: none;
            text-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        
        .nav-menu-toggle {
            display: none;
            background: none;
            border: none;
            color: var(--primary-color);
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
        }
        
        .nav-menu-toggle:hover {
            background-color: rgba(0,0,0,0.05);
        }
        
        .nav-links-container {
            width: 100%;
        }
        
        .nav-links {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        /* MELHORADO: Alto contraste para links de navegação no estado padrão */
        .nav-links a {
            color: var(--text-color, #333) !important;
            background-color: #f0f0f0 !important;
            text-decoration: none !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            transition: all 0.25s ease !important;
            font-weight: 600 !important;
            border: 2px solid rgba(0,0,0,0.1) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            display: flex !important;
            align-items: center !important;
            position: relative !important;
            overflow: hidden !important;
            margin: 2px !important;
        }
        
        .nav-links a i {
            margin-right: 6px;
            font-size: 0.9rem;
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
                padding: 10px;
            }
            
            .nav-top-row {
                width: 100%;
                justify-content: space-between;
            }
            
            .nav-menu-toggle {
                display: block;
                transition: all 0.3s ease;
            }
            
            .nav-links-container {
                display: none;
                margin-top: 15px;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .nav-links-container.visible {
                display: block;
            }
            
            .nav-links {
                flex-direction: column;
                gap: 8px;
            }
            
            .nav-links a {
                width: 100%;
                justify-content: flex-start;
            }
            
            .user-menu {
                justify-content: flex-end;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Forçar a reavaliação dos estilos
    void document.documentElement.offsetHeight;
    
    // Verificar se o tema atual tem suas regras específicas aplicadas
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'night';
    console.log(`Estilos de cabeçalho aplicados/atualizados para tema: ${currentTheme}`);
}

/**
 * Garante que o CSS do seletor de tema seja aplicado corretamente
 */
function ensureThemeMenuStyles() {
    const style = document.createElement('style');
    style.id = 'theme-menu-fix-styles';
    style.textContent = `
        .theme-menu {
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 5px;
            background-color: var(--card-bg, #ffffff);
            border: 1px solid var(--card-border, rgba(0,0,0,0.1));
            border-radius: 4px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            width: 200px;
            z-index: 9999 !important;
            display: none;
        }
        
        .user-menu {
            position: relative;
        }
        
        /* Garantir que o tema seja visível no modo escuro */
        [data-theme="night"] .theme-menu {
            background-color: #333;
            border-color: #555;
        }
        
        /* Garantir que os botões sejam clicáveis */
        .theme-toggle-btn,
        .theme-option {
            cursor: pointer !important;
            position: relative !important;
            z-index: 1000 !important;
        }
    `;
    
    // Remover estilos antigos se existirem
    const oldStyle = document.getElementById('theme-menu-fix-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(style);
}

// -------------------- FUNÇÕES EXPOSTAS GLOBALMENTE --------------------

// Verificação de integridade do tema
function verifyTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = localStorage.getItem('preferredTheme') || 'night';
    
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
window.verifyTheme = verifyTheme;
window.applyThemeToEntirePage = applyThemeToEntirePage;

// Auto-execução para garantir que o tema seja aplicado imediatamente
(function() {
    const savedTheme = localStorage.getItem('preferredTheme') || 'night';
    applyThemeToEntirePage(savedTheme);
})();

// Função para atualizar estado de login/logout no cabeçalho
function updateLoginLogoutButton() {
    // Atualizar botão na página inicial (se existir)
    const loginLogoutBtn = document.getElementById('loginLogoutBtn');
    
    // Atualizar botão no cabeçalho comum
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Usuário está logado
        if (loginLogoutBtn) {
            loginLogoutBtn.textContent = 'Minha Conta';
            loginLogoutBtn.classList.add('logged-in');
        }
        
        // Atualizar informações do usuário no cabeçalho
        const userInfo = document.getElementById('userInfo');
        const authLinks = document.getElementById('authLinks');
        const usernameElement = document.getElementById('username');
        
        if (userInfo && authLinks && usernameElement) {
            userInfo.style.display = 'flex';
            authLinks.style.display = 'none';
            usernameElement.textContent = currentUser.name || currentUser.username;
        }
    } else {
        // Usuário não está logado
        if (loginLogoutBtn) {
            loginLogoutBtn.textContent = 'Login';
            loginLogoutBtn.classList.remove('logged-in');
        }
        
        // Resetar cabeçalho para estado de não-logado
        const userInfo = document.getElementById('userInfo');
        const authLinks = document.getElementById('authLinks');
        
        if (userInfo && authLinks) {
            userInfo.style.display = 'none';
            authLinks.style.display = 'block';
        }
    }
}

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
    
    // Expor funções para uso global
    window.handleLoginButtonClick = handleLoginButtonClick;
    window.createLoginModal = createLoginModal;
    window.handleLoginSubmit = handleLoginSubmit;
    window.handleLogout = handleLogout;
}

// Criar modal de login
function createLoginModal() {
    // Remover modal existente caso exista (para evitar duplicação)
    const existingModal = document.getElementById('login-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.id = 'login-modal';
    
    loginModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Login</h2>
            <div id="login-error-message" class="message error" style="display: none;"></div>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-username">Nome de usuário</label>
                    <input type="text" id="login-username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Senha</label>
                    <input type="password" id="login-password" name="password" required>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn-primary">Entrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(loginModal);
    
    // Eventos do modal
    const closeModal = loginModal.querySelector('.close-modal');
    closeModal.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    // Fechar modal se clicar fora do conteúdo
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Adicionar evento de submit ao formulário
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLoginSubmit);
}

// Verificar sessão do usuário
function checkUserSession() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.id) {
        updateUIForLoggedUser(currentUser);
    }
}

// Substitua a função updateUIForLoggedUser por esta versão corrigida
function updateUIForLoggedUser(userData) {
    // Verificar se o usuário está no localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Encontrar o botão de login
    const loginButton = document.getElementById('login-button');
    
    if (loginButton) {
        // Atualizar o botão de login
        loginButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
        loginButton.title = `Logado como ${userData.name}`;
        loginButton.dataset.logged = 'true';
        
        // Criar badge de usuário logado se não existir
        let userBadge = document.getElementById('user-logged-badge');
        if (!userBadge && loginButton.parentNode) {
            userBadge = document.createElement('div');
            userBadge.id = 'user-logged-badge';
            userBadge.className = 'user-logged-badge';
            
            // Adicionar após o botão de login (com verificação adicional)
            loginButton.parentNode.insertBefore(userBadge, loginButton);
        }
        
        // Atualizar o conteúdo do badge se ele existir
        if (userBadge) {
            const userTypeClass = userData.type === 'COUNCILLOR' ? 'badge-COUNCILLOR' : 'badge-NON_COUNCILLOR';
            userBadge.innerHTML = `
                <span class="user-name">${userData.name}</span>
                <span class="badge ${userTypeClass}">${userData.type === 'COUNCILLOR' ? 'Conselheiro' : 'Não-Conselheiro'}</span>
            `;
        }
    }
    
    // Atualizar botão de login/logout na página inicial (se existir)
    const loginLogoutBtn = document.getElementById('loginLogoutBtn');
    if (loginLogoutBtn) {
        loginLogoutBtn.textContent = 'Minha Conta';
        loginLogoutBtn.href = '#';
    }
}

// Exibir perfil do usuário
function showUserProfile(userData) {
    // Criar um modal para exibir informações do usuário
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'profile-modal';
    
    let pronounText = '';
    if (userData.pronoun === 'HE_HIM') pronounText = 'Ele/Dele';
    else if (userData.pronoun === 'SHE_HER') pronounText = 'Ela/Dela';
    else if (userData.pronoun === 'THEY_THEM') pronounText = 'Elu/Delu';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Perfil de Usuário</h2>
            
            <div class="user-profile">
                <div class="profile-header">
                    <h3>${userData.name}</h3>
                    <span class="badge ${userData.type === 'COUNCILLOR' ? 'badge-COUNCILLOR' : 'badge-NON_COUNCILLOR'}">
                        ${userData.type === 'COUNCILLOR' ? 'Conselheiro' : 'Não-Conselheiro'}
                    </span>
                </div>
                
                <div class="profile-details">
                    <div class="profile-item">
                        <strong>ID:</strong> ${userData.id}
                    </div>
                    <div class="profile-item">
                        <strong>Nome de Usuário:</strong> ${userData.username}
                    </div>
                    <div class="profile-item">
                        <strong>Pronome:</strong> ${pronounText}
                    </div>
                </div>
                
                <button class="btn-secondary" id="modal-logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Sair da Conta
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Configurar eventos
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
    
    const logoutBtn = document.getElementById('modal-logout-btn');
    logoutBtn.addEventListener('click', () => {
        handleLogout();
        modal.remove();
    });
}

// Atualizar UI para usuário deslogado
function updateUIForLoggedOutUser() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginButton.title = '';
        loginButton.dataset.logged = 'false';
    }
    
    // Remover badge de usuário logado se existir
    const userBadge = document.getElementById('user-logged-badge');
    if (userBadge) {
        userBadge.parentNode.removeChild(userBadge);
    }
    
    // Mostrar todos os botões de login na página principal (se existirem)
    document.querySelectorAll('a[href="/login.html"]').forEach(link => {
        link.style.display = 'block';
    });
    
    // Atualizar botão de login/logout na página inicial (se existir)
    const loginLogoutBtn = document.getElementById('loginLogoutBtn');
    if (loginLogoutBtn) {
        loginLogoutBtn.textContent = 'Login';
        loginLogoutBtn.href = '#';
        loginLogoutBtn.onclick = function(e) {
            e.preventDefault();
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.style.display = 'block';
            }
            return false;
        };
    }
}

// Função para manipular clique no botão de login/logout
function handleLoginButtonClick(event) {
    if (event) event.preventDefault();
    
    // Verificar se o usuário está logado pelo localStorage, não pelo botão
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isLogged = !!currentUser;
    
    if (isLogged) {
        // Logout
        localStorage.removeItem('currentUser');
        updateUIForLoggedOutUser();
        alert('Você saiu do sistema com sucesso!');
        // Recarregar a página para atualizar o estado da UI
        window.location.reload();
    } else {
        // Mostrar modal de login - criá-lo se não existir
        let loginModal = document.getElementById('login-modal');
        if (!loginModal) {
            console.log("Modal de login não encontrado. Criando novo modal...");
            loginModal = createLoginModal();
        }
        
        // Exibir o modal
        if (loginModal) {
            loginModal.style.display = 'block';
        } else {
            console.error("Não foi possível criar ou encontrar o modal de login.");
            alert("Erro ao abrir a janela de login. Por favor, recarregue a página e tente novamente.");
        }
    }
}

// Criar modal de login
function createLoginModal() {
    // Remover modal existente caso exista (para evitar duplicação)
    const existingModal = document.getElementById('login-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.id = 'login-modal';
    
    // Adicionar estilo inline para garantir que o modal seja visível
    loginModal.style.display = 'none';
    loginModal.style.position = 'fixed';
    loginModal.style.zIndex = '1000';
    loginModal.style.left = '0';
    loginModal.style.top = '0';
    loginModal.style.width = '100%';
    loginModal.style.height = '100%';
    loginModal.style.overflow = 'auto';
    loginModal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    
    loginModal.innerHTML = `
        <div class="modal-content" style="background-color: var(--card-bg); margin: 10% auto; padding: 25px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);">
            <span class="close-modal" style="color: var(--text-color); float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
            <h2>Login</h2>
            <div id="login-error-message" class="message error" style="display: none; color: var(--error-color); background-color: rgba(255, 0, 0, 0.1); padding: 10px; border-radius: 4px; margin-bottom: 15px;"></div>
            <form id="login-form">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="login-username" style="display: block; margin-bottom: 5px; font-weight: 600;">Nome de usuário</label>
                    <input type="text" id="login-username" name="username" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--input-bg); color: var(--text-color);">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="login-password" style="display: block; margin-bottom: 5px; font-weight: 600;">Senha</label>
                    <input type="password" id="login-password" name="password" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--input-bg); color: var(--text-color);">
                </div>
                <div class="form-buttons" style="margin-top: 25px; display: flex; justify-content: flex-end;">
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; background-color: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Entrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(loginModal);
    
    // Eventos do modal
    const closeModal = loginModal.querySelector('.close-modal');
    closeModal.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    // Fechar modal se clicar fora do conteúdo
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Adicionar evento de submit ao formulário
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLoginSubmit);
    
    return loginModal;
}

// Substitua a função handleLoginSubmit por esta versão
async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorMessage = document.getElementById('login-error-message');
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
        if (errorMessage) {
            errorMessage.textContent = 'Por favor, preencha todos os campos.';
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    try {
        // Usar a função de busca existente para validar as credenciais
        const response = await fetch('/api/users/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao fazer login');
        }
        
        // Login bem-sucedido - armazenar dados do usuário
        localStorage.setItem('currentUser', JSON.stringify(data));
        
        // Limpar campos
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Fechar modal
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        // Mensagem de sucesso
        alert(`Bem-vindo(a), ${data.name}!`);
        
        // Recarregar a página para atualizar o estado da UI
        window.location.reload();
        
    } catch (error) {
        console.error('Erro no login:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Usuário ou senha incorretos.';
            errorMessage.style.display = 'block';
        } else {
            alert('Erro ao fazer login: ' + (error.message || 'Usuário ou senha incorretos'));
        }
    }
}

// Função para fazer logout
function handleLogout() {
    // Limpar dados do usuário
    localStorage.removeItem('currentUser');
    
    // Atualizar UI
    updateUIForLoggedOutUser();
    
    // Mensagem de sucesso
    alert('Você saiu do sistema com sucesso!');
    
    // Recarregar a página para atualizar o estado da UI
    window.location.reload();
}

// Função para alternar tema (manter a função existente)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'night' ? 'ocean' : 'night';
    
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('preferredTheme', nextTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (nextTheme === 'night') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // Atualizar a cor do tema no metatag
    const themeColor = document.getElementById('theme-color');
    if (themeColor) {
        themeColor.content = nextTheme === 'night' ? '#121212' : '#2c3e50';
    }
}

// Exportar funções para uso global
window.insertCommonHeader = insertCommonHeader;
window.handleLoginButtonClick = handleLoginButtonClick;
window.handleLoginSubmit = handleLoginSubmit;
window.handleLogout = handleLogout;

// Chamar a função para criar o header quando o DOM estiver carregado (apenas se não foi chamado antes)
document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('.nav-container') && !document.querySelector('.main-header')) {
        insertCommonHeader();
    }
});

// Adicionar esta função após a função updateLoginLogoutButton()

// Função para gerenciar o login/logout - compatível com a usada na página inicial
function loginButtonClick(event) {
    if (event) event.preventDefault();
    
    // Verificar se o usuário já está logado
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Usuário já está logado - fazer logout
        if (confirm('Deseja sair da sua conta?')) {
            localStorage.removeItem('currentUser');
            alert('Você saiu do sistema com sucesso!');
            window.location.reload();
        }
    } else {
        // Usuário não está logado - mostrar modal de login
        let loginModal = document.getElementById('login-modal');
        if (!loginModal) {
            // Criar modal se não existir
            if (typeof createLoginModal === 'function') {
                const modal = createLoginModal();
                if (modal) {
                    modal.style.display = 'block';
                } else {
                    alert('Erro ao criar o modal de login. Por favor, recarregue a página.');
                }
            } else {
                alert('Erro ao inicializar o sistema de login. Por favor, recarregue a página.');
            }
        } else {
            // Exibir modal existente
            loginModal.style.display = 'block';
        }
    }
    
    return false;
}

// Expor a função loginButtonClick globalmente
window.loginButtonClick = loginButtonClick;

// Definir a função loginButtonClick no escopo global ANTES de qualquer outra operação
// Esta função deve ser idêntica à usada na página inicial
window.loginButtonClick = function(event) {
    if (event) event.preventDefault();
    
    // Verificar se o usuário já está logado
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Usuário já está logado - fazer logout
        if (confirm('Deseja sair da sua conta?')) {
            localStorage.removeItem('currentUser');
            alert('Você saiu do sistema com sucesso!');
            window.location.reload();
        }
    } else {
        // Usuário não está logado - mostrar modal de login
        // Primeiro, vamos ver se o modal já existe
        let loginModal = document.getElementById('login-modal');
        
        if (!loginModal) {
            // Criar modal se não existir
            loginModal = createLoginModal();
        }
        
        // Mostrar o modal
        if (loginModal) {
            loginModal.style.display = 'block';
        } else {
            console.error('Não foi possível criar ou encontrar o modal de login.');
            alert('Erro ao abrir o painel de login. Por favor, recarregue a página.');
        }
    }
    
    return false;
};

// Função auxiliar para criar o modal de login se não existir
function createLoginModal() {
    // Verificar se já existe
    if (document.getElementById('login-modal')) {
        return document.getElementById('login-modal');
    }
    
    // Criar o modal
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Acesso ao Sistema</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="username">Usuário:</label>
                    <input type="text" id="username-field" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Senha:</label>
                    <input type="password" id="password-field" name="password" required>
                </div>
                <div class="remember-me">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">Lembrar meus dados</label>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn-small">Entrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar comportamento para fechar o modal
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Fechar ao clicar fora do conteúdo
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tratar o envio do formulário
    const form = modal.querySelector('#login-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username-field').value;
        const password = document.getElementById('password-field').value;
        
        // Simulação de login (em um sistema real, você faria uma requisição ao backend)
        if (username && password) {
            // Dados de usuário simulados
            const userData = {
                id: 1,
                username: username,
                name: username.charAt(0).toUpperCase() + username.slice(1),
                email: `${username}@example.com`,
                role: 'user'
            };
            
            // Salvar no localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // Fechar modal e atualizar UI
            modal.style.display = 'none';
            alert('Login realizado com sucesso!');
            window.location.reload();
        } else {
            alert('Por favor, preencha todos os campos.');
        }
    });
    
    return modal;
}

// Função para criar a modal de login para uso em todas as páginas
function createLoginModal() {
    // Verificar se já existe
    if (document.getElementById('login-modal')) {
        return document.getElementById('login-modal');
    }
    
    // Criar o modal
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Acesso ao Sistema</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="username">Usuário:</label>
                    <input type="text" id="username-field" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Senha:</label>
                    <input type="password" id="password-field" name="password" required>
                </div>
                <div class="remember-me">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">Lembrar meus dados</label>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn-small">Entrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar comportamento para fechar o modal
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Fechar ao clicar fora do conteúdo
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tratar o envio do formulário
    const form = modal.querySelector('#login-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username-field').value;
        const password = document.getElementById('password-field').value;
        
        // Simulação de login (em um sistema real, você faria uma requisição ao backend)
        if (username && password) {
            // Dados de usuário simulados
            const userData = {
                id: 1,
                username: username,
                name: username.charAt(0).toUpperCase() + username.slice(1),
                email: `${username}@example.com`,
                role: 'user'
            };
            
            // Salvar no localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // Fechar modal e atualizar UI
            modal.style.display = 'none';
            alert('Login realizado com sucesso!');
            window.location.reload();
        } else {
            alert('Por favor, preencha todos os campos.');
        }
    });
    
    return modal;
}

// Função de login para ser chamada pelos botões
function loginButtonClick(event) {
    if (event) event.preventDefault();
    
    // Verificar se o usuário já está logado
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Usuário já está logado - fazer logout
        if (confirm('Deseja sair da sua conta?')) {
            localStorage.removeItem('currentUser');
            alert('Você saiu do sistema com sucesso!');
            window.location.reload();
        }
    } else {
        // Usuário não está logado - mostrar modal de login
        let loginModal = document.getElementById('login-modal');
        if (!loginModal) {
            loginModal = createLoginModal();
        }
        loginModal.style.display = 'block';
    }
    
    return false;
}

// Expor as funções globalmente
window.loginButtonClick = loginButtonClick;
window.createLoginModal = createLoginModal;