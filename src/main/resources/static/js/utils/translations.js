// Dicionário com traduções
const translations = {
    en: "Functionality under development. But as a suggestion, you can use your browser's native translator.",
    pt: "Funcionalidade em desenvolvimento. Mas como sugestão, você pode usar o tradutor nativo do seu navegador.",
    es: "Funcionalidad en desarrollo. Pero como sugerencia, puedes utilizar el traductor nativo de tu navegador.",
    fr: "Fonctionnalité en cours de développement. Mais à titre de suggestion, vous pouvez utiliser le traducteur natif de votre navigateur.",
    zh: "功能正在开发中。但建议您使用浏览器的本机翻译器。",
    ru: "Функционал в разработке. Но в качестве предложения вы можете использовать встроенный переводчик вашего браузера.",
    ar: "وظائف قيد التطوير. ولكن كاقتراح، يمكنك استخدام المترجم الأصلي للمتصفح الخاص بك.",
    yo: "Iṣẹ ṣiṣe labẹ idagbasoke. Ṣugbọn gẹgẹbi imọran, o le lo onitumọ abinibi ti aṣawakiri rẹ."
};

function translatePage(language) {
    // Obtém a mensagem traduzida com base no idioma selecionado
    const message = translations[language] || translations.en; // Default para inglês se o idioma não for encontrado

    // Altera o idioma da página
    document.documentElement.lang = language;

    // Notifica o usuário sobre como ativar a tradução
    showNotification(message);

    // Oculta o menu de idiomas
    document.getElementById('languageMenu').style.display = 'none';
}

 // Alterna o menu de idiomas e o posiciona próximo ao botão
 function toggleLanguageMenu(event) {
    const menu = document.getElementById('languageMenu');
    const button = event.currentTarget;

    if (menu.style.display === 'none' || menu.style.display === '') {
        const rect = button.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}