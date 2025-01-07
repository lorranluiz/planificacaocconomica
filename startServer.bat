@echo off
title Prompt Interativo - PM2
echo Iniciando server.js com PM2...
pm2 start server.js

:: Verifica se houve algum erro na execução
if %errorlevel% neq 0 (
    echo Ocorreu um erro ao executar o comando "pm2 start server.js".
) else (
    echo Comando executado com sucesso.
)

:: Deixa o prompt interativo
echo.
echo O terminal continuará aberto para comandos adicionais.
echo.
cmd
