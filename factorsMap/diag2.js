const fs = require('fs');

const html = fs.readFileSync('./mapa_fabricas.html', 'utf8');
const startIdx = html.indexOf('const empresas = [');
const startParse = startIdx + 18;

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
const empresas = JSON.parse(jsonStr);

console.log('\n=== DIAGNOSTICO: POR QUE APENAS ~45 DE 105 APARECEM? ===\n');

// Verificar coordenadas
let validas = 0, inválidas = 0;
empresas.forEach((e, i) => {
  if (Number.isFinite(e.coordenadas.lat) && Number.isFinite(e.coordenadas.lon)) {
    validas++;
  } else {
    inválidas++;
  }
});

console.log('1. COORDENADAS:');
console.log('   Validas:', validas);
console.log('   Invalidas:', inválidas);

// Contar por endereço
const endereços = {};
empresas.forEach(e => {
  endereços[e.endereco] = (endereços[e.endereco] || 0) + 1;
});

const uniqueCount = Object.keys(endereços).length;
console.log('\n2. LOCALIZACOES:');
console.log('   Enderecos unicos:', uniqueCount);
console.log('   Empresas total:', empresas.length);

// Top 10
const top = Object.entries(endereços)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 10);

console.log('\n3. ENDERECOS COM MAIS EMPRESAS:');
top.forEach(([end, count]) => {
  console.log('   [' + count + '] ' + end.substring(0, 50));
});

// Simular renderização
console.log('\n4. SIMULACAO DE RENDERIZACAO:');
let markersAdded = 0;
let coordMap = {};

empresas.forEach((e, idx) => {
  const lat = e.coordenadas.lat;
  const lon = e.coordenadas.lon;
  const key = lat.toFixed(4) + ',' + lon.toFixed(4);
  
  if (!coordMap[key]) {
    coordMap[key] = [];
  }
  coordMap[key].push(e.nome);
  markersAdded++;
});

console.log('   Marcadores criados:', markersAdded);
console.log('   Coordenadas unicas:', Object.keys(coordMap).length);
console.log('   Mapa mostra ~' + Object.keys(coordMap).length + ' clusters visuais');

console.log('\n=== CONCLUSAO ===');
console.log('105 empresas = ' + uniqueCount + ' enderecos unicos');
console.log('Se vendo ~45 marcadores, pode ser:');
console.log('- Problema de renderizacao (checa console.log')
console.log('- Zoom muito afastado (agrupa markers)');
console.log('- Alguns enderecos falharam geocodificacao');

console.log('\n');
