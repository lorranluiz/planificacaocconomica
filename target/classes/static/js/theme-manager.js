/**
 * Gerenciador de tema - responsável por alternar entre os temas do sistema
 */
const ThemeManager = {
    // Lista de temas disponíveis
    themes: ['ocean', 'night', 'sunlight', 'bolchevick'],
    
    // Tema atual
    currentTheme: localStorage.getItem('preferredTheme') || 'ocean',
    
    // Inicializa o gerenciador de tema
    init: function() {
        // Aplicar tema salvo ou padrão
        this.applyTheme(this.currentTheme);
        
        // Adicionar evento ao botão de alternar tema
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    },
    
    // Alterna para o próximo tema na lista
    toggleTheme: function() {
        // Obter índice do tema atual
        const currentIndex = this.themes.indexOf(this.currentTheme);
        
        // Calcular próximo índice (circular)
        const nextIndex = (currentIndex + 1) % this.themes.length;
        
        // Aplicar próximo tema
        this.applyTheme(this.themes[nextIndex]);
    },
    
    // Aplica um tema específico
    applyTheme: function(theme) {
        // Atualizar tema atual
        this.currentTheme = theme;
        
        // Aplicar ao elemento HTML
        document.documentElement.setAttribute('data-theme', theme);
        
        // Atualizar a meta tag theme-color para navegadores móveis
        const metaThemeColor = document.getElementById('theme-color');
        if (metaThemeColor) {
            const themeColors = {
                ocean: '#2c3e50',
                night: '#121212',
                sunlight: '#ff9800',
                bolchevick: '#c62828'
            };
            metaThemeColor.content = themeColors[theme] || '#2c3e50';
        }
        
        // Salvar preferência
        localStorage.setItem('preferredTheme', theme);
        
        console.log('Tema aplicado:', theme);
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});