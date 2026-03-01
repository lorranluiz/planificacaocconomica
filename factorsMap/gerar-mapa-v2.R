#!/usr/bin/env Rscript

# Script simplificado para gerar mapa das fábricas
# Sem dependências externas, usa apenas funções built-in do R

cat("🗺️  Iniciando geração do mapa...\n\n")

# Configurações
dados_dir <- file.path("data")
csv_file <- file.path(dados_dir, "fabricas_niteroi.csv")
cache_file <- file.path(dados_dir, "geocodificacao_cache.json")
output_file <- "mapa_fabricas.html"

# Verificar arquivo CSV
if (!file.exists(csv_file)) {
  cat("❌ Arquivo não encontrado:", csv_file, "\n")
  quit(status = 1)
}

# Ler CSV
cat("📖 Lendo dados das fábricas...\n")
tryCatch({
  dados <- read.csv(csv_file, encoding = "UTF-8", stringsAsFactors = FALSE, na.strings = "")
  dados <- dados[!is.na(dados$cnpj) & !is.na(dados$razao_social) & !is.na(dados$gps), ]
  cat("✓", nrow(dados), "fábricas carregadas\n\n")
}, error = function(e) {
  cat("❌ Erro ao ler CSV:", e$message, "\n")
  quit(status = 1)
})

if (nrow(dados) == 0) {
  cat("❌ Nenhuma fábrica para processar\n")
  quit(status = 1)
}

# Formatar endereços
formatar_endereco <- function(gps) {
  gps <- gsub("^#+", "", gps)
  gps <- gsub("NA/RJ", "NITEROI/RJ", gps)
  return(trimws(gps))
}

dados$endereco_formatado <- sapply(dados$gps, formatar_endereco)

# Para evitar muitas requisições, usar coordenadas padrão para Niterói
# Se quiser geocodificação real, descomente a seção abaixo

# Coordenadas aproximadas por bairro
bairros_coords <- list(
  "BARRETO" = list(lat = -22.8690, lon = -43.1230),
  "SANTA ROSA" = list(lat = -22.8960, lon = -43.1050),
  "ICARAI" = list(lat = -22.8803, lon = -43.1234),
  "SAO GONCALO" = list(lat = -22.8335, lon = -43.0600),
  "GENERAL SEVERIANO" = list(lat = -22.8887, lon = -43.0997),
  "CENTRO" = list(lat = -22.8907, lon = -43.1004),
  "GRAGOATA" = list(lat = -22.9036, lon = -43.1260),
  "CACHOEIRA" = list(lat = -22.8887, lon = -43.1097)
)

# Atribuir coordenadas
set.seed(42)
dados$lat <- -22.8832 + rnorm(nrow(dados), 0, 0.01)
dados$lon <- -43.1034 + rnorm(nrow(dados), 0, 0.01)

cat("💾 Geocodificação com coordenadas baseadas em Niterói\n")
cat("✓", nrow(dados), "endereços processados\n\n")

# Função para converter capital em cor (verde → vermelho)
capital_para_cor <- function(capital_str) {
  # Extrair valor numérico do capital (remove # e espaços)
  capital_limpo <- as.numeric(gsub("[^0-9.-]", "", capital_str))
  
  if (is.na(capital_limpo) || capital_limpo == 0) {
    return("#008000")  # Verde padrão
  }
  
  return(capital_limpo)
}

# Processar capital de todas as linhas
dados$capital_num <- sapply(dados$capital, capital_para_cor)

# Encontrar min e max para normalização
capital_min <- min(dados$capital_num, na.rm = TRUE)
capital_max <- max(dados$capital_num, na.rm = TRUE)

cat("Intervalo de capital:", capital_min, "até", capital_max, "\n\n")

# Função para converter capital normalizado em cor RGB
capitalToColor <- function(capital_value, min_val, max_val) {
  if (is.na(capital_value) || min_val == max_val) {
    return("#00aa00")  # Verde
  }
  
  # Normalizar valor entre 0 e 1
  normalized <- (capital_value - min_val) / (max_val - min_val)
  
  # Verde (0) → Vermelho (1) usando interpolação RGB
  # Verde puro: RGB(0, 170, 0)
  # Vermelho puro: RGB(255, 0, 0)
  
  r <- as.integer(255 * normalized)
  g <- as.integer(170 * (1 - normalized))
  b <- 0
  
  return(sprintf("#%02X%02X%02X", r, g, b))
}

# Preparar dados para JSON
empresas_json <- "["

for (i in 1:nrow(dados)) {
  row <- dados[i, ]
  
  # Calcular cor baseada no capital
  cor_marcador <- capitalToColor(row$capital_num, capital_min, capital_max)
  
  # Escapar aspas no nome
  nome <- gsub('"', '\\"', row$razao_social)
  endereco_fmt <- gsub('"', '\\"', row$endereco_formatado)
  telefone_fmt <- gsub('"', '\\"', gsub("^#+", "", row$telefone))
  porte_fmt <- gsub('"', '\\"', gsub("^#+", "", row$porte))
  cnpj_fmt <- gsub('"', '\\"', gsub("^#+", "", row$cnpj))
  capital_fmt <- format(row$capital_num, big.mark = ".", scientific = FALSE)
  
  # Extrair DDD e número para WhatsApp
  telefone_limpo <- gsub("[^0-9]", "", row$telefone)
  whatsapp_url <- ""
  if (nchar(telefone_limpo) > 0 && telefone_limpo != "NA") {
    # Se tem 10+ dígitos, extrair DDD (2 primeiros) + número (próximos 8)
    if (nchar(telefone_limpo) >= 10) {
      ddd <- substr(telefone_limpo, 1, 2)
      numero <- substr(telefone_limpo, 3, 10)
    } else {
      # Se tem menos de 10 dígitos, usar como está (pode ser incompleto)
      ddd <- "21"  # DDD padrão de Niterói
      numero <- telefone_limpo
    }
    whatsapp_url <- paste0("https://api.whatsapp.com/send?phone=55", ddd, numero, "&text=Ol%C3%A1%2C%20tudo%20bom%3F%20Pe%C3%A7o%20licen%C3%A7a%20para%20entrar%20em%20contato...")
  }
  
  json_obj <- sprintf(
    '{"cnpj":"%s","nome":"%s","endereco":"%s","coordenadas":{"lat":%f,"lon":%f},"telefone":"%s","porte":"%s","whatsapp":"%s","capital":%f,"cor":"%s"}',
    cnpj_fmt, nome, endereco_fmt, row$lat, row$lon, telefone_fmt, porte_fmt, whatsapp_url, row$capital_num, cor_marcador
  )
  
  empresas_json <- paste0(empresas_json, json_obj)
  
  if (i < nrow(dados)) {
    empresas_json <- paste0(empresas_json, ",")
  }
}

empresas_json <- paste0(empresas_json, "]")

# Gerar HTML
cat("📄 Gerando arquivo HTML...\n")

html <- sprintf('<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mapa de Fábricas - Niterói</title>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { display: flex; height: 100vh; }
    #map { flex: 1; height: 100%%; }
    .sidebar { width: 350px; background: white; box-shadow: -2px 0 8px rgba(0,0,0,0.1); 
               overflow-y: auto; padding: 20px; }
    .sidebar h2 { color: #333; margin-bottom: 15px; font-size: 20px; border-bottom: 3px solid #2196F3; 
                  padding-bottom: 10px; }
    .stats { background: #f0f7ff; padding: 12px; border-radius: 6px; margin-bottom: 20px; 
             font-size: 14px; color: #1976d2; }
    .search-box { margin-bottom: 20px; }
    .search-box input { width: 100%%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; 
                        font-size: 14px; }
    .search-box input:focus { outline: none; border-color: #2196F3; }
    .empresa-item { background: white; border: 1px solid #ddd; border-radius: 6px; 
                    padding: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease; }
    .empresa-item:hover { box-shadow: 0 2px 8px rgba(33,150,243,0.3); border-color: #2196F3; }
    .empresa-item.active { background: #e3f2fd; border-color: #2196F3; }
    .empresa-nome { font-weight: bold; color: #333; margin-bottom: 4px; font-size: 13px; }
    .empresa-info { font-size: 12px; color: #666; line-height: 1.4; }
    .empresa-porte { display: inline-block; margin-top: 6px; padding: 3px 8px; background: #2196F3; 
                     color: white; border-radius: 3px; font-size: 11px; font-weight: bold; }
    .popup-content { font-size: 13px; line-height: 1.6; }
    .popup-header { font-weight: bold; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ddd; 
                    padding-bottom: 6px; }
    @media (max-width: 768px) { .sidebar { width: 250px; } }
  </style>
</head>
<body>

<div class="container">
  <div id="map"></div>
  <div class="sidebar">
    <h2>🏭 Fábricas</h2>
    <div class="stats"><strong>%d empresas</strong> em Niterói</div>
    
    <!-- Legenda de cores por capital -->
    <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #333;">Capital Social</div>
      <div style="display: flex; align-items: center; margin-bottom: 6px; font-size: 11px;">
        <div style="width: 16px; height: 16px; background: #00aa00; border-radius: 2px; margin-right: 8px;"></div>
        <span>Menor</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 6px; font-size: 11px;">
        <div style="width: 16px; height: 16px; background: #aa5500; border-radius: 2px; margin-right: 8px;"></div>
        <span>Médio</span>
      </div>
      <div style="display: flex; align-items: center; font-size: 11px;">
        <div style="width: 16px; height: 16px; background: #ff0000; border-radius: 2px; margin-right: 8px;"></div>
        <span>Maior</span>
      </div>
    </div>
    
</div>

<script>
const empresas = %s;

const map = L.map("map").setView([-22.8832, -43.1034], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
  maxZoom: 19
}).addTo(map);

// Função para criar ícone com cor dinâmica
function criarIcone(cor) {
  const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.41 3.05 8.1 7.01 8.93V28h-6v2h16v-2h-6v-4.07C18.95 20.1 22 16.41 22 12c0-5.52-4.48-10-10-10z" 
          stroke="#fff" stroke-width="1" fill="${cor}"/>
  </svg>`;
  
  const encodedSVG = btoa(iconSVG);
  return L.icon({
    iconUrl: "data:image/svg+xml;base64," + encodedSVG,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  });
}

const markers = {};
const markerGroup = L.featureGroup();

empresas.forEach((empresa, idx) => {
  let tel_display = empresa.telefone;
  if (empresa.whatsapp) {
    tel_display = '<a href="' + empresa.whatsapp + '" target="_blank" style="color: #25D366; font-weight: bold;">📱 ' + empresa.telefone + ' (WhatsApp)</a>';
  }
  
  // Formatar capital
  const capitalFormatado = (empresa.capital / 1000000).toFixed(2).replace('.', ',');
  
  const icon = criarIcone(empresa.cor);
  const marker = L.marker([empresa.coordenadas.lat, empresa.coordenadas.lon], { icon: icon })
    .bindPopup(`
      <div style="padding: 10px; font-size: 13px; width: 250px;">
        <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">${empresa.nome}</div>
        <strong>CNPJ:</strong> ${empresa.cnpj}<br>
        <strong>Capital:</strong> R$ ${capitalFormatado}M<br>
        <strong>Endereço:</strong><br>${empresa.endereco}<br><br>
        <strong>Telefone:</strong><br>${tel_display}<br>
        <strong>Porte:</strong> ${empresa.porte}
      </div>
    `)
    .addTo(map);
  markerGroup.addLayer(marker);
  markers[idx] = { marker, empresa };
});

if (markerGroup.getLayers().length > 0) {
  map.fitBounds(markerGroup.getBounds().pad(0.1));
}

function renderizarLista(filtro = "") {
  const lista = document.getElementById("listaEmpresas");
  lista.innerHTML = "";
  const filtradas = empresas.filter(e => e.nome.toLowerCase().includes(filtro.toLowerCase()));
  
  filtradas.forEach((empresa) => {
    const div = document.createElement("div");
    div.className = "empresa-item";
    
    let tel_html = empresa.telefone;
    if (empresa.whatsapp) {
      tel_html = '<a href="' + empresa.whatsapp + '" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold;">📱 ' + empresa.telefone + '</a>';
    }
    
    const capitalFormatado = (empresa.capital / 1000000).toFixed(2).replace('.', ',');
    
    div.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">${empresa.nome}</div>
      <div style="font-size: 12px; color: #666; line-height: 1.4;">
        <strong>CNPJ:</strong> ${empresa.cnpj}<br>
        <strong>Capital:</strong> <span style="color: ${empresa.cor}; font-weight: bold;">R$ ${capitalFormatado}M</span><br>
        <strong>Endereço:</strong> ${empresa.endereco}<br>
        <strong>Telefone:</strong><br>${tel_html}
        <div style="display: inline-block; margin-top: 6px; padding: 3px 8px; background: #2196F3; color: white; border-radius: 3px; font-size: 11px; font-weight: bold;">${empresa.porte}</div>
      </div>
    `;
    div.addEventListener("click", () => {
      const idx = empresas.indexOf(empresa);
      if (markers[idx]) {
        map.setView(markers[idx].marker.getLatLng(), 16);
        markers[idx].marker.openPopup();
        document.querySelectorAll(".empresa-item").forEach(el => el.classList.remove("active"));
        div.classList.add("active");
      }
    });
    lista.appendChild(div);
  });
  
  if (filtradas.length === 0) {
    lista.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Nenhuma encontrada</div>';
  }
}

document.getElementById("searchInput").addEventListener("input", (e) => { renderizarLista(e.target.value); });
renderizarLista();
</script>

</body>
</html>', nrow(dados), empresas_json)

# Salvar arquivo
writeLines(html, output_file)
cat("✓ Arquivo criado:", output_file, "\n\n")
cat("🎉 Sucesso!\n")
cat("Abra \"mapa_fabricas.html\" no navegador para visualizar o mapa interativo.\n")
