/**
 * Sistema de Gerenciamento de Esquema de Cores Unificado
 * Sincroniza o esquema de cores entre páginas Node e Java
 */

(function() {
    'use strict';
    
    const COLOR_SCHEME_KEY = 'preferredColorScheme';
    const DEFAULT_SCHEME = 'blue';
    
    /**
     * Obtém o esquema de cores atual do localStorage
     */
    function getCurrentScheme() {
        try {
            return localStorage.getItem(COLOR_SCHEME_KEY) || DEFAULT_SCHEME;
        } catch (e) {
            console.error('Erro ao ler esquema de cores:', e);
            return DEFAULT_SCHEME;
        }
    }
    
    /**
     * Salva o esquema de cores no localStorage
     */
    function saveScheme(scheme) {
        try {
            localStorage.setItem(COLOR_SCHEME_KEY, scheme);
            console.log('Esquema de cores salvo:', scheme);
        } catch (e) {
            console.error('Erro ao salvar esquema de cores:', e);
        }
    }
    
    /**
     * Aplica o esquema de cores no documento
     */
    function applyScheme(scheme) {
        document.documentElement.setAttribute('data-color-scheme', scheme);
        console.log('Esquema de cores aplicado:', scheme);
        
        // Disparar evento customizado para notificar outras partes do código
        const event = new CustomEvent('colorSchemeChanged', { detail: { scheme } });
        window.dispatchEvent(event);
    }
    
    /**
     * Alterna entre os esquemas de cores
     */
    function toggleScheme() {
        const current = getCurrentScheme();
        const newScheme = current === 'blue' ? 'red' : 'blue';
        saveScheme(newScheme);
        applyScheme(newScheme);
        return newScheme;
    }
    
    /**
     * Inicializa o esquema de cores na carga da página
     */
    function initScheme() {
        const scheme = getCurrentScheme();
        applyScheme(scheme);
    }
    
    // Aplicar esquema imediatamente
    initScheme();
    
    // Exportar API global
    window.ColorScheme = {
        get: getCurrentScheme,
        set: function(scheme) {
            if (scheme === 'blue' || scheme === 'red') {
                saveScheme(scheme);
                applyScheme(scheme);
            }
        },
        toggle: toggleScheme,
        apply: applyScheme
    };
    
    console.log('Sistema de esquema de cores inicializado');
})();
