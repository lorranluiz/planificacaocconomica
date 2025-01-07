#!/bin/bash
# Define o título do terminal (funciona em terminais suportados)
echo -e "\033]0;Parar Servidor\007"

echo "Parando todos os servidores gerenciados pelo PM2..."
pm2 stop all

# Verifica o código de saída do comando
if [ $? -ne 0 ]; then
    echo "Ocorreu um erro ao executar o comando 'pm2 stop all'."
else
    echo "Todos os servidores foram parados com sucesso."
fi