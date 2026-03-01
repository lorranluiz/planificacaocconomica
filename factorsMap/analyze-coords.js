const fs = require('fs');

// Read HTML file
const html = fs.readFileSync('mapa_fabricas.html', 'utf8');

// Extract empresas array - more careful parsing
const startMarker = 'const empresas = ';
const startIdx = html.indexOf(startMarker);
const startParse = startIdx + startMarker.length;

// Find the matching closing bracket
let bracketCount = 0;
let inString = false;
let escapeNext = false;
let endIdx = startParse;

for (let i = startParse; i < html.length; i++) {
  const char = html[i];
  
  if (escapeNext) {
    escapeNext = false;
    continue;
  }
  
  if (char === '\\') {
    escapeNext = true;
    continue;
  }
  
  if (char === '"' && (i === 0 || html[i-1] !== '\\')) {
    inString = !inString;
    continue;
  }
  
  if (!inString) {
    if (char === '[') bracketCount++;
    if (char === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
}

const jsonStr = html.substring(startParse, endIdx);

try {
  const empresas = JSON.parse(jsonStr);
  
  let validCount = 0;
  let invalidCount = 0;
  const invalidList = [];
  
  empresas.forEach((e, idx) => {
    const lat = e.coordenadas?.lat;
    const lon = e.coordenadas?.lon;
    
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      validCount++;
    } else {
      invalidCount++;
      invalidList.push({
        idx,
        nome: e.nome,
        lat,
        lon,
        endereco: e.endereco
      });
    }
  });
  
  // Write report to file
  const report = `=== ANÁLISE DE COORDENADAS ===\n\n`;
  const report2 = `✅ Coordenadas Válidas: ${validCount}\n`;
  const report3 = `❌ Coordenadas Inválidas: ${invalidCount}\n`;
  const report4 = `📊 Total de Empresas: ${empresas.length}\n\n`;
  
  let invalidListStr = '';
  if (invalidCount > 0) {
    invalidListStr = `Empresas com coordenadas inválidas:\n`;
    invalidList.forEach(item => {
      invalidListStr += `  - ${item.nome} | lat=${item.lat}, lon=${item.lon}\n`;
    });
  }
  
  fs.writeFileSync('coords-analysis.txt', report + report2 + report3 + report4 + invalidListStr);
  
  console.log(`Relatório salvo em coords-analysis.txt`);
  console.log(`Válidas: ${validCount}`);
  console.log(`Inválidas: ${invalidCount}`);
  console.log(`Total: ${empresas.length}`);
  
} catch (err) {
  console.error('Erro:', err.message);
}
