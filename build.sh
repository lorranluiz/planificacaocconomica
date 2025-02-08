#!/bin/bash

echo "Instalando dependências do sistema..."

# Instalando Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
# Verificando a Instalação
node -v
npm -v

#Instalando gerenciador de servidores PM2

npm install -g pm2
# Verificando a Instalação
pm2 -v

# Instalando dependências Python
sudo apt install python3

# Criar links simbólicos
sudo ln -s /usr/bin/python3 /usr/bin/python

# Instalando bibliotecas Python
sudo apt install python3-matplotlib
sudo apt install python3-numpy

# Instalando dependências do projeto
echo "Instalando dependências do projeto..."
npm install

echo "Instalação das dependências concluída!"

# Executar o script build.js
echo "Executando o script de construção..."
node build.js