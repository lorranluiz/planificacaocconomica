# Execução em outro computador (mapa de fábricas)

## Scripts essenciais
Envie estes arquivos para o servidor/outro computador:

- `dados_abertos.R`
- `filter_fabricas.R`
- `gerar-mapa-v2.R`
- `run_main.ps1`

## Pasta obrigatória de dados
Envie também a pasta `data/` completa, com os arquivos de entrada do CNPJ.

## Como rodar
No PowerShell, dentro da pasta do projeto:

```powershell
./run_main.ps1
```

O `run_main.ps1` já executa, em ordem:
1. `dados_abertos.R`
2. `filter_fabricas.R`
3. `gerar-mapa-v2.R`

## Saída final
Ao final, o arquivo gerado é:

- `mapa_fabricas.html`

Abra esse arquivo no navegador para visualizar o mapa.
