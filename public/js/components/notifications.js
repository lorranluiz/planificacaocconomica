function showNotification(message, isSuccess) {
    const notificationBox = document.getElementById('successBox');
    notificationBox.textContent = message; // Define a mensagem
    notificationBox.style.opacity = '1'; // Torna visível
    notificationBox.style.top = '10px'; // Move para uma posição visível

    // Ajusta a cor de fundo com base no tipo de mensagem
    if (isSuccess) {
        notificationBox.style.backgroundColor = 'rgba(0, 255, 0, 0.8)'; // Verde para mensagens de sucesso
        notificationBox.style.color = 'rgba(255, 255, 255, 1)'; // Verde para mensagens de sucesso
    } else {
        notificationBox.style.backgroundColor = 'rgba(255, 255, 0, 0.8)'; // Amarelo amarronzado para mensagens de erro/atenção
        notificationBox.style.color = 'rgba(70, 0, 0, 1)'; // Verde para mensagens de sucesso
    }

     // Calcula a duração da mensagem com base no tamanho do texto
    const duration = Math.ceil(message.length / 80) * 3000;

    // Oculta a mensagem após o tempo calculado
    setTimeout(() => {
        notificationBox.style.opacity = '0'; // Torna invisível
        notificationBox.style.top = '-50px'; // Move para fora da tela
    }, duration);
}

function displaySuccessMessage(message) {
    const successBox = document.getElementById("successBox");
    successBox.textContent = message;
    successBox.style.top = "10px";
    successBox.style.opacity = "1";

    setTimeout(() => {
        successBox.style.top = "-50px";
        successBox.style.opacity = "0";
    }, 3000); // Oculta a mensagem após 3 segundos
}
