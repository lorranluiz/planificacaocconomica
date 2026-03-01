const fs = require('fs');
const html = fs.readFileSync('mapa_fabricas.html', 'utf-8');
const start = html.indexOf('const empresas = [') + 18;
const end = html.indexOf('];', start);
const jsonStr = html.substring(start, end);

const empresas = JSON.parse(jsonStr);
console.log(`Total de empresas: ${empresas.length}`);

let validas = 0;
let invalidas = [];
for (const e of empresas) {
  const lat = e.coordenadas.lat;
  const lon = e.coordenadas.lon;
  if (lat && lon) {
    validas++;
  } else {
    invalidas.push(e.nome);
  }
}

console.log(`Coordenadas válidas: ${validas}`);
console.log(`Coordenadas inválidas: ${invalidas.length}`);

const enderecos = new Set(empresas.map(e => e.endereco));
console.log(`Endereços únicos: ${enderecos.size}`);

if (invalidas.length > 0) {
  console.log('\nEmpresas com coordenadas inválidas:');
  invalidas.slice(0, 20).forEach(nome => console.log(`  - ${nome}`));
  if (invalidas.length > 20) {
    console.log(`  ... e mais ${invalidas.length - 20}`);
  }
}
