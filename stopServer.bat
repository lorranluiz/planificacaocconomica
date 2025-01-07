@echo off
title Prompt Interativo - Parar PM2
echo Parando o servidor gerenciado pelo PM2...
pm2 stop all

:: Verifica se houve algum erro na execução
if %errorlevel% neq 0 (
    echo Ocorreu um erro ao executar o comando "pm2 stop server.js".
) else (
    echo O servidor foi parado com sucesso.
)

:: Deixa o prompt interativo
echo.
echo O terminal continuará aberto para comandos adicionais.
echo.
cmd
