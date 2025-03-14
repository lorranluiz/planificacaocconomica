function generateQRCode(data) {
    const qrCodeDiv = document.getElementById("uuidQRCode");

    // Limpa qualquer QR Code anterior
    qrCodeDiv.innerHTML = "";

    // Gera o QR Code diretamente na div
    new QRCode(qrCodeDiv, {
        text: data,
        width: 200,
        height: 200,
        colorDark: "#000000", // Cor do QR Code
        colorLight: "#ffffff", // Cor de fundo
        correctLevel: 2 // Nível de correção de erros
    });
    
}