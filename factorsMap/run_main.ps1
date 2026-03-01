# Executa pipeline completo para gerar o mapa de fábricas
$ErrorActionPreference = "Stop"

function Get-RscriptPath {
	$cmd = Get-Command Rscript.exe -ErrorAction SilentlyContinue
	if ($cmd) {
		return $cmd.Source
	}

	$candidatos = @(
		"C:\Program Files\R\R-4.5.2\bin\Rscript.exe",
		"C:\Program Files\R\R-4.4.0\bin\Rscript.exe",
		"C:\Program Files\R\R-4.3.3\bin\Rscript.exe"
	)

	foreach ($c in $candidatos) {
		if (Test-Path $c) {
			return $c
		}
	}

	throw "Rscript.exe nao encontrado. Instale o R e garanta o Rscript no PATH."
}

$rscript = Get-RscriptPath
$scripts = @(
	"dados_abertos.R",
	"filter_fabricas.R",
	"gerar-mapa-v2.R"
)

foreach ($script in $scripts) {
	$scriptPath = Join-Path (Get-Location) $script
	if (-not (Test-Path $scriptPath)) {
		throw "Script nao encontrado: $scriptPath"
	}

	Write-Host "`n=== Executando $script ==="
	& $rscript $scriptPath

	if ($LASTEXITCODE -ne 0) {
		throw "Falha ao executar $script (exit code $LASTEXITCODE)."
	}
}

Write-Host "`nPipeline concluido com sucesso. Abra mapa_fabricas.html no navegador."
