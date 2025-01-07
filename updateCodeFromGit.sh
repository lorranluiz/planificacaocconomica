#!/bin/bash
# Atualiza o código e dados no servidor com base no repositório remoto

echo "Resetando alterações locais..."
git reset --hard HEAD
if [ $? -ne 0 ]; then
    echo "Erro ao executar 'git reset --hard HEAD'."
    exit 1
fi

echo "Limpando arquivos não rastreados..."
git clean -fd
if [ $? -ne 0 ]; then
    echo "Erro ao executar 'git clean -fd'."
    exit 1
fi

echo "Atualizando código a partir do repositório remoto..."
git pull origin
if [ $? -ne 0 ]; then
    echo "Erro ao executar 'git pull origin'."
    exit 1
fi

echo "Código e dados atualizados com sucesso!"
