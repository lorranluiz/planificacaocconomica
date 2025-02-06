function addTooltipBehavior(inputElement) {
    inputElement.addEventListener('mouseenter', (e) => {
        const value = e.target.value;

        // Cria o tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = value;
        document.body.appendChild(tooltip);

        // Calcula a posição do tooltip
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
    });

    inputElement.addEventListener('mouseleave', () => {
        // Remove o tooltip ao sair
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    let isDragging = false; // Verifica se o usuário está arrastando
    let startX = 0, startY = 0; // Posição inicial do mouse
    let scrollLeft = 0, scrollTop = 0; // Posição inicial de rolagem
    let velocityX = 0, velocityY = 0; // Velocidade de rolagem

    document.body.style.cursor = 'default'; // Cursor padrão

    document.addEventListener('mousedown', (e) => {

        isDragging = true;
        startX = e.pageX; // Posição X inicial
        startY = e.pageY; // Posição Y inicial
        scrollLeft = window.scrollX; // Posição inicial de rolagem horizontal
        scrollTop = window.scrollY; // Posição inicial de rolagem vertical

        velocityX = 0;
        velocityY = 0;

        document.body.style.cursor = 'move'; // Muda o cursor para "move"
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return; // Só funciona enquanto arrastando

        // Calcula o quanto o mouse se moveu
        const moveX = startX - e.pageX;
        const moveY = startY - e.pageY;

        velocityX = moveX * 0.05; // Ajuste de sensibilidade
        velocityY = moveY * 0.05;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false; // Termina o arraste
        document.body.style.cursor = 'default'; // Restaura o cursor padrão
    });

    // Suaviza a rolagem
    function smoothScroll() {
        if (!isDragging) {
            // Diminui gradualmente a velocidade quando o mouse não está arrastando
            velocityX *= 0.98; // Ajuste de desaceleração
            velocityY *= 0.98;
        }

        // Atualiza a posição da rolagem
        window.scrollBy(velocityX, velocityY);

        // Para o loop quando o movimento for insignificante
        if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
            requestAnimationFrame(smoothScroll);
        }
    }

    // Inicia a suavização contínua
    document.addEventListener('mousemove', () => {
        if (isDragging || Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
            requestAnimationFrame(smoothScroll);
        }
    });
});

