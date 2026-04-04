<p align="center">
    <picture>
        <source srcset="./public/images/planEconLogoBranca1.png" media="(prefers-color-scheme: dark)">
        <img src="./public/images/planEconLogo1.png" alt="Economic Planning Logo">
    </picture>
</p>

# PlanEcon

Sistema de planejamento econômico baseado em conselhos populares.

## 📚 Index
1. [Languages](#languages)
2. [Introduction](#introduction)
3. [What Is This?](#what-is-this)
4. [How to Couple Production and Distribution](#how-to-couple-production-and-distribution)
5. [Features](#features)
6. [System Requirements](#system-requirements)
7. [How to Use](#how-to-use)
    1. [Clone the Repository](#clone-the-repository)
    2. [Install](#install)
    3. [Start All Servers](#start-servers)
    4. [Calculate Estimates (Council)](#calculate-estimates-council)
    5. [Update Demands and Goals (Committee)](#update-demands-and-goals-committee)
8. [Support](#support)
9. [Contact](#contact)
10. [New Features](#new-features)

<a id="languages"></a>
## 🌐 Languages 

- [🇺🇸 English](./README.md)
- [🇧🇷 Português](./README_PT.md)

<a id="introduction"></a>
# 🚀 Introduction
Economic Planning

This project is an open-source tool for optimized and democratic economic planning. It allows planning an economy in a democratic and optimized way, helping the working class to solve the problem of economic planning in workers' states and international socialism.

<a id="what-is-this"></a>
## ℹ️ What Is This?

This application is a practical tool that brings together everything the working class has developed socially and technically, everything it has developed with its historical lessons, for the organization of its own production. Much of what the workers themselves have done today is still used against them, for the benefit of a tiny minority that constitutes the so-called bourgeoisie, which, for this purpose, extracts for itself abysmal profits in relation to the wages paid for the reproduction of workers' labor, in addition to maintaining the unemployment of a portion of the workers to maintain the so-called reserve army, which optimizes the exploitation of workers and the profits of the bourgeoisie. A nefarious endemic characteristic of this is the cycles in which the bourgeoisie, to maintain its profit rate, resorts to the destruction of productive forces (through wars or by letting a pandemic run rampant) or by stimulating ideologies that promote divisions within the working class, through superficial political polarizations or by fostering ideologies that underpin oppressions, new or existing (mainly xenophobia, racism, LGBTphobia, sexism, and ableism).

We haven't created anything that the working class hasn't already created; we've merely compiled its splendid creation and given it an emancipatory political direction.

<a id="how-to-couple-production-and-distribution"></a>
## 💡 How to Couple Production and Distribution
Distribution does not exist independently of production.
Capital is accumulated labor from the previous period.
There is accumulated labor in the planned economy.
However, labor can only be accumulated by the person who worked, not by another, which determines exploitation (that is, there is no exploitation).
The Workers' State only compulsorily reallocates part of the accumulated labor, similar to a tax, but essentially different, as all the reallocated labor goes back to the workers themselves, who only receive it if they work in one of the essential sectors. There is no advantage, privilege, perks, servitude, it does not go to the banking sector, speculative sector, nor does it feed any productive or non-productive capital. It is the final justice that justifies itself, without classes above exploiting those below.

<a id="features"></a>
## ✨ Features
- User registration: Users register.
- Residents' Association: Workers manage their places of residence.
- Committees: Workers manage their workplaces and the services and distribution of the products they produce and consume.
- Popular Councils: From the district jurisdictions of a municipality to the World Council (International, Intercontinental, or whatever name), the decisions of the workers form an interconnected totality.

<a id="system-requirements"></a>
## 💻 System Requirements
- JavaScript version 1.5 or higher.
- Node.JS version 22.13.1 or compatible.
- NPM version 10.9.2 or compatible.

<a id="how-to-use"></a>
## 🔧 How to Use
<a id="clone-the-repository"></a>

### 1. Clone the Repository
```bash
sudo apt-get install git
git clone https://github.com/lorranluiz/planificacaocconomica.git
```
<a id="install"></a>
### 2. Install
```bash
cd planificacaocconomica
chmod +x build.sh
./build.sh
```

<a id="start-servers"></a>
### 3. Start All Servers
```bash
./start-all-servers.sh
```

This single command starts all project servers:
- **Node.js server** (factorsMap) - http://localhost:3000
- **Java/Spring Boot server** - http://localhost:8080 and https://localhost:8443

#### To stop all servers:
```bash
./stop-all-servers.sh
```

#### Server logs:
- Node.js: `factorsmap-server.log`
- Spring Boot: `spring-boot.log`

<a id="calculate-estimates-council"></a>
### 4. Calculate Estimates (Council)
1. Acesse a página do conselho.
2. Selecione o conselho desejado no dropdown.
3. Clique no botão "Calcular Estimativas".
4. Confirme a operação.
5. As estimativas serão calculadas e exibidas na interface.
6. Clique em "Salvar Alterações" para persistir os dados.

<a id="update-demands-and-goals-committee"></a>
### 5. Update Demands and Goals (Committee)
1. Acesse a página do comitê.
2. Selecione o comitê desejado no dropdown.
3. Clique no botão "Atualizar Demandas e Metas".
4. Confirme a operação.
5. As demandas e metas serão atualizadas e exibidas na interface.
6. Clique em "Salvar Alterações" para persistir os dados.

<a id="support"></a>
## 💖 Support This Project
This project is open-source and built with dedication to help the community. If you find it useful and would like to support its development, consider making a donation. Your support helps keep this project alive and evolving! 🚀

🔹 Ways to support:
- GitHub Sponsors: [![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/lorranluiz)
- Pix (Brazil): 21997427600

Every contribution, big or small, makes a difference. Thank you for your support! 💙

<a id="contact"></a>
## 📧 Contact
If you have any questions, please raise an issue or contact us at lorranluiz@id.uff.br .

<a id="new-features"></a>
## 🆕 New Features

### Cálculo de Estimativas para Conselhos

Implementamos um sistema que permite aos conselhos populares calcular estimativas de matriz tecnológica e vetor de demanda com base nos dados das instâncias filhas (comitês, trabalhadores e conselhos subordinados).

#### Funcionalidades:

- **Cálculo de média ponderada**: O sistema calcula a média dos coeficientes técnicos e demandas das instâncias filhas.
- **Atualização automática**: Os valores calculados são automaticamente aplicados ao conselho.
- **Interface visual**: Um botão na interface permite acionar o cálculo e visualizar os resultados.

### Atualização de Demandas e Metas para Comitês

Implementamos um sistema que permite aos comitês atualizar suas demandas e metas de produção com base nos dados do conselho ao qual estão associados.

#### Funcionalidades:

- **Sincronização com o conselho**: O comitê obtém a demanda do conselho para o produto que ele produz.
- **Atualização de meta**: A meta de produção é automaticamente atualizada.
- **Atualização de demandas**: As demandas de materializações sociais são sincronizadas.
- **Interface visual**: Um botão na interface permite acionar a atualização.

### Sistema de Notificações

Implementamos um sistema de notificações visuais para dar feedback ao usuário sobre operações realizadas.

#### Tipos de notificações:

- **Sucesso**: Operação concluída com sucesso.
- **Erro**: Falha na operação.
- **Informação**: Mensagem informativa.
- **Aviso**: Alerta sobre possíveis problemas.

### Tratamento de Erros Aprimorado

Implementamos um sistema de tratamento de erros para fornecer mensagens mais claras e facilitar a resolução de problemas.

#### Funcionalidades:

- **Manipulador global de exceções**: Tratamento consistente de erros em toda a aplicação.
- **Exceções personalizadas**: Exceções específicas para cada tipo de erro.
- **Mensagens detalhadas**: Descrições claras dos problemas encontrados.
- **Logging aprimorado**: Registro detalhado de erros para depuração.
