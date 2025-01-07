#!/bin/bash
# Define o título do terminal (funciona em terminais suportados)
echo -e "\033]0;Iniciar Servidor\007"

echo "Iniciando servidor com PM2..."
pm2 start all

# Verifica o código de saída do comando
if [ $? -ne 0 ]; then
    echo "Ocorreu um erro ao executar o comando 'pm2 start server.js'."
else
    echo "Servidor iniciado com sucesso."
fi

