const fs = require('fs');

// Ler HTML
const html = fs.readFileSync('./mapa_fabricas.html', 'utf8');

// Parse empresas array
const startIdx = html.indexOf('const empresas = [');
const endIdx = html.indexOf('];', startIdx);
const jsonStr = html.substring(startIdx + 18, endIdx + 1);

try {
  const empresas = JSON.parse(jsonStr);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNÓSTICO: 105 EMPRESAS - POR QUE APENAS ~45 APARECEM?');
  console.log('='.repeat(70) + '\n');
  
  // Verificar coordenadas
  let validas = 0, inválidas = 0;
  empresas.forEach((e, i) => {
    if (Number.isFinite(e.coordenadas.lat) && Number.isFinite(e.coordenadas.lon)) {
      validas++;
    } else {
      inválidas++;
    }
  });
  
  console.log(`✅ Coordenadas válidas: ${validas}/105`);
  console.log(`❌ Coordenadas inválidas: ${inválidas}/105`);
  console.log(`\n1️⃣ CAUSA 1: Se inválidas > 0, isso explicaria os faltantes\n`);
  
  // Contar endereços únicos (agrupar por endereco)
  const enderecos = new Map();
  empresas.forEach(e => {
    const count = enderecos.get(e.endereco) || 0;
    enderecos.set(e.endereco, count + 1);
  });
  
  console.log(`📍 Endereços únicos: ${enderecos.size}`);
  console.log(`\n2️⃣ CAUSA 2: Se múltiplas empresas compartilham endereço`);
  console.log(`   Possibilidade: Todos os 105 marcadores aparecem, mas`);
  console.log(`   muitos estão no MESMO LOCAL (você vê ${enderecos.size} clusters visual)`);
  console.log(`   Zoom in verifica se há cluster marker\n`);
  
  // Contar por endereço quantas empresas tem
  console.log(`📈 Distribuição por endereço:`);
  const grouped = Array.from(enderecos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  grouped.forEach(([endereco, count]) => {
    console.log(`   [${count}] empresas em: ${endereco.substring(0, 50)}`);
  });
  
  console.log('3️⃣ CAUSA 3: Erro silencioso na funcao criarIcone()');
  console.log('   Teste: Existe variavel cor em todas empresas?');
  
  let semCor = 0;
  empresas.forEach(e => {
    if (!e.cor || !e.cor.match(/^#[0-9A-F]{6}$/i)) {
      semCor++;
      console.log(`\\n   AVISO: Empresa ${e.nome} tem cor INVALIDA: ${e.cor}`);
    }
  });
  console.log(`   Total sem cor: ${semCor}\n`);
  
  console.log('4️⃣ CAUSA 4: MarkerGroup nao esta adicionando todos');
  console.log('   Seria loop do forEach tendo early return\\n');
  
  console.log('='.repeat(70));
  console.log('HIPÓTESE MAIS PROVÁVEL: Múltiplas empresas compartilham');
  console.log('MESMO endereco → MESMO marcador visual → Você vê ~45');
  console.log('mas ainda há 105 marcadores renderizados (apenas sobrepostos)');
  console.log('='.repeat(70) + '\n');
  
  // Simular o que acontece no mapa
  console.log('🔍 SIMULAÇÃO DO RENDERIZADOR:\n');
  
  let markerCount = 0;
  const coordsVistas = new Set();
  
  empresas.forEach((empresa, idx) => {
    const coords = empresa.coordenadas;
    const key = `${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`; // Marca de localização
    
    if (coordsVistas.has(key)) {
      // Mesma coordenada - seria sobreposto (não visto)
    } else {
      coordsVistas.add(key);
    }
    markerCount++;
  });
  
  console.log(`Marcadores criados: ${markerCount}`);
  console.log(`Coordenadas VISUALMENTE diferentes: ${coordsVistas.size}`);
  console.log(`\n💡 RESULTADO: Mapa mostra ~${coordsVistas.size} clusters visualmente`);
  console.log(`   mas todos os 105 marcadores foram criados JavaScript\n`);
  
} catch (err) {
  console.error('Erro:', err.message);
}

console.log('='.repeat(70));
