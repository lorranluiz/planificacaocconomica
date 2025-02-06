function generateUUID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uuidBase = '';

    // Gera os primeiros 22 caracteres do UUID (Base64-like)
    for (let i = 0; i < 22; i++) {
        uuidBase += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Gera os 2 dígitos verificadores
    const checksum = generateUUIDChecksum(uuidBase);

    // Retorna o UUID completo (22 caracteres + 2 dígitos verificadores)
	let uuid = uuidBase + checksum;
	
	//console.info("uuid: ");
	//console.log(uuid);
	
    return uuid;
}

function generateUUIDChecksum(uuidBase) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let sum = 0;

    // Calcula a soma ponderada dos caracteres
    for (let i = 0; i < uuidBase.length; i++) {
        const char = uuidBase[i];
        const value = characters.indexOf(char); // Índice no conjunto de caracteres
        sum += value * (i + 1); // Ponderação baseada na posição (1-based)
    }

    // Gera 2 caracteres alfanuméricos para o checksum
    const checksumValue1 = sum % 62; // Primeiro caractere do checksum
    const checksumValue2 = Math.floor(sum / 62) % 62; // Segundo caractere do checksum

    return characters[checksumValue1] + characters[checksumValue2];
}

function validateUUID(uuid) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Verifica o comprimento total do UUID (22 caracteres + 2 dígitos verificadores)
    if (uuid.length !== 24) return false;

    // Extrai a base e o checksum do UUID
    const uuidBase = uuid.slice(0, 22); // Primeiros 22 caracteres
    const checksum = uuid.slice(22);   // Últimos 2 caracteres

    // Recalcula o checksum com base na base do UUID
    const calculatedChecksum = generateUUIDChecksum(uuidBase);

    // Compara o checksum fornecido com o recalculado
    return checksum === calculatedChecksum;
}