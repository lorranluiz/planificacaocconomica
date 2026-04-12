const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = require('url');
const { spawn, execFileSync } = require('child_process');

const PORT = 3000;
const CACHE_FILE = path.join(__dirname, 'geocache.json');
const GEOCODE_DELAY_MS = 900;
const GEOCODE_TEMP_MAX_RETRIES = 2;
const GEOCODE_TEMP_RETRY_DELAY_MS = 3500;
const GEOCODE_KNOWN_MISS_COOLDOWN_MS = 15 * 60 * 1000;
const GEOCODE_CITY_DISTANCE_MAX_KM = 220;

const UF_BY_STATE_NAME = {
  ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA', CEARA: 'CE',
  'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', GOIAS: 'GO', MARANHAO: 'MA',
  'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', PARA: 'PA',
  PARAIBA: 'PB', PARANA: 'PR', PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', RONDONIA: 'RO', RORAIMA: 'RR',
  'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE', TOCANTINS: 'TO'
};

const UF_BOUNDS = {
  AC: { minLat: -11.2, maxLat: -7.0, minLon: -74.1, maxLon: -66.2 },
  AL: { minLat: -10.6, maxLat: -8.8, minLon: -38.5, maxLon: -35.0 },
  AP: { minLat: 0.8, maxLat: 4.6, minLon: -52.2, maxLon: -49.9 },
  AM: { minLat: -9.9, maxLat: 2.3, minLon: -73.9, maxLon: -56.0 },
  BA: { minLat: -18.4, maxLat: -8.5, minLon: -46.8, maxLon: -37.3 },
  CE: { minLat: -7.9, maxLat: -2.7, minLon: -41.8, maxLon: -37.2 },
  DF: { minLat: -16.1, maxLat: -15.4, minLon: -48.3, maxLon: -47.3 },
  ES: { minLat: -21.4, maxLat: -17.8, minLon: -41.9, maxLon: -39.4 },
  GO: { minLat: -19.5, maxLat: -12.4, minLon: -53.3, maxLon: -45.7 },
  MA: { minLat: -10.4, maxLat: -1.0, minLon: -48.8, maxLon: -41.8 },
  MT: { minLat: -18.1, maxLat: -7.2, minLon: -61.8, maxLon: -50.0 },
  MS: { minLat: -24.1, maxLat: -17.1, minLon: -58.3, maxLon: -50.9 },
  MG: { minLat: -22.9, maxLat: -14.2, minLon: -51.3, maxLon: -39.8 },
  PA: { minLat: -9.9, maxLat: 2.0, minLon: -58.0, maxLon: -46.0 },
  PB: { minLat: -8.4, maxLat: -6.0, minLon: -38.9, maxLon: -34.8 },
  PR: { minLat: -26.8, maxLat: -22.4, minLon: -54.8, maxLon: -48.0 },
  PE: { minLat: -9.5, maxLat: -7.2, minLon: -41.6, maxLon: -34.7 },
  PI: { minLat: -11.3, maxLat: -2.7, minLon: -45.9, maxLon: -40.2 },
  RJ: { minLat: -23.4, maxLat: -20.8, minLon: -44.9, maxLon: -40.9 },
  RN: { minLat: -6.0, maxLat: -4.8, minLon: -38.8, maxLon: -34.8 },
  RS: { minLat: -33.8, maxLat: -27.0, minLon: -57.8, maxLon: -49.6 },
  RO: { minLat: -13.8, maxLat: -7.9, minLon: -66.9, maxLon: -59.8 },
  RR: { minLat: 0.5, maxLat: 5.4, minLon: -61.9, maxLon: -59.8 },
  SC: { minLat: -29.4, maxLat: -25.9, minLon: -53.9, maxLon: -48.3 },
  SP: { minLat: -25.4, maxLat: -19.7, minLon: -53.2, maxLon: -44.0 },
  SE: { minLat: -11.6, maxLat: -9.5, minLon: -38.4, maxLon: -36.3 },
  TO: { minLat: -13.6, maxLat: -5.0, minLon: -50.8, maxLon: -45.7 }
};

// Rastreia processos R ativos:  { NITEROI: { process, pid, startedAt, codigo, cidadeDir } }
const processingJobs = {};
// Cache simples de progress.json por cidade (invalida a cada 10 s)
const progressCache  = {};
const cityDataCache = {};
let previousCpuSample = null;
let systemUsageCache = { timestamp: 0, data: null };

function isRecentProgressHeartbeat(progressData, maxAgeMs = 20 * 60 * 1000) {
  if (!progressData || typeof progressData !== 'object') return false;
  const status = String(progressData.status || '').toLowerCase();
  if (status !== 'running') return false;
  const rawUpdatedAt = progressData.updated_at || progressData.updatedAt || null;
  if (!rawUpdatedAt) return false;
  const ts = Date.parse(String(rawUpdatedAt));
  if (!Number.isFinite(ts)) return false;
  return (Date.now() - ts) <= maxAgeMs;
}

function isPidRunning(pid) {
  const numericPid = parseInt(pid, 10);
  if (!Number.isFinite(numericPid) || numericPid <= 0) return false;
  try {
    process.kill(numericPid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function isMetaProcessRunning(meta) {
  if (!meta || typeof meta !== 'object') return false;
  const lastAction = String(meta.lastAction || '').toLowerCase();
  const isTerminalAction = lastAction === 'finalizado' || lastAction === 'encerrado_com_erro' || lastAction === 'cancelado';
  const pidSource = !isTerminalAction
    ? (meta.pid || meta.lastPid)
    : meta.pid;
  const pid = parseInt(pidSource, 10);
  return isPidRunning(pid);
}

function slugCidade(nomeCidade) {
  return String(nomeCidade || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseNumericValue(value) {
  if (value === undefined || value === null) return NaN;
  const cleaned = String(value)
    .replace(/#/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

function isFactoryRow(row) {
  if (!row || typeof row !== 'object') return false;
  const capital = parseNumericValue(row.capital);
  const ramo = parseNumericValue(row.ramo);
  const porte = String(row.porte || '').trim().toUpperCase();
  return Number.isFinite(capital) && Number.isFinite(ramo)
    && capital > 1000000
    && ramo >= 1000000 && ramo <= 3300000
    && porte === 'GRANDE/OUTROS';
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function readCpuSample() {
  const cpus = os.cpus() || [];
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times || {};
    idle += t.idle || 0;
    total += (t.user || 0) + (t.nice || 0) + (t.sys || 0) + (t.idle || 0) + (t.irq || 0);
  }
  return { idle, total };
}

function getCpuPercent() {
  const current = readCpuSample();
  if (!previousCpuSample) {
    previousCpuSample = current;
    return null;
  }
  const deltaIdle = current.idle - previousCpuSample.idle;
  const deltaTotal = current.total - previousCpuSample.total;
  previousCpuSample = current;
  if (deltaTotal <= 0) return null;
  return clampPercent((1 - (deltaIdle / deltaTotal)) * 100);
}

function getRamPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return null;
  return clampPercent(((total - free) / total) * 100);
}

function parseNvidiaSmi() {
  try {
    const out = execFileSync(
      'nvidia-smi',
      ['--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'],
      { encoding: 'utf8', timeout: 2000, windowsHide: true }
    ).trim();

    if (!out) return { gpuPercent: null, gpuMemoryPercent: null, gpuDisponivel: false };

    const linhas = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!linhas.length) return { gpuPercent: null, gpuMemoryPercent: null, gpuDisponivel: false };

    let somaGpu = 0;
    let somaMemPct = 0;
    let totalGpu = 0;
    let totalMem = 0;

    for (const linha of linhas) {
      const [gpuRaw, memUsedRaw, memTotalRaw] = linha.split(',').map(v => v.trim());
      const gpu = parseFloat(gpuRaw);
      const memUsed = parseFloat(memUsedRaw);
      const memTotal = parseFloat(memTotalRaw);
      if (Number.isFinite(gpu)) {
        somaGpu += gpu;
        totalGpu += 1;
      }
      if (Number.isFinite(memUsed) && Number.isFinite(memTotal) && memTotal > 0) {
        somaMemPct += (memUsed / memTotal) * 100;
        totalMem += 1;
      }
    }

    const gpuPercent = totalGpu > 0 ? clampPercent(somaGpu / totalGpu) : null;
    const gpuMemoryPercent = totalMem > 0 ? clampPercent(somaMemPct / totalMem) : null;
    const gpuDisponivel = Number.isFinite(gpuPercent) || Number.isFinite(gpuMemoryPercent);
    return { gpuPercent, gpuMemoryPercent, gpuDisponivel };
  } catch (_) {
    return { gpuPercent: null, gpuMemoryPercent: null, gpuDisponivel: false };
  }
}

function getSystemUsageSnapshot() {
  const now = Date.now();
  if (systemUsageCache.data && (now - systemUsageCache.timestamp) < 1500) {
    return systemUsageCache.data;
  }

  const cpuPercent = getCpuPercent();
  const ramPercent = getRamPercent();
  const gpu = parseNvidiaSmi();

  const data = {
    cpuPercent,
    ramPercent,
    gpuPercent: gpu.gpuPercent,
    gpuMemoryPercent: gpu.gpuMemoryPercent,
    gpuDisponivel: !!gpu.gpuDisponivel,
    updatedAt: new Date().toISOString()
  };

  systemUsageCache = { timestamp: now, data };
  return data;
}

function listVersionedRDirs(baseDir) {
  try {
    if (!baseDir || !fs.existsSync(baseDir)) return [];
    return fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^R-\d/i.test(entry.name))
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (_) {
    return [];
  }
}

function resolveRscriptBinary() {
  const candidates = [];
  const seen = new Set();
  const addCandidate = (candidate) => {
    if (!candidate) return;
    const value = String(candidate).trim().replace(/^"|"$/g, '');
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  if (process.platform === 'win32') {
    try {
      const whereOut = execFileSync('where', ['Rscript.exe'], { encoding: 'utf8' }).trim();
      whereOut.split(/\r?\n/).forEach(addCandidate);
    } catch (_) {}

    ['ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA'].forEach(envKey => {
      const root = process.env[envKey];
      if (!root) return;
      const rRoot = path.join(root, 'R');
      listVersionedRDirs(rRoot).forEach(dirName => {
        addCandidate(path.join(rRoot, dirName, 'bin', 'Rscript.exe'));
        addCandidate(path.join(rRoot, dirName, 'bin', 'x64', 'Rscript.exe'));
      });
    });

    addCandidate('Rscript.exe');
    addCandidate('Rscript');
  } else {
    try {
      const whichOut = execFileSync('which', ['Rscript'], { encoding: 'utf8' }).trim();
      whichOut.split(/\r?\n/).forEach(addCandidate);
    } catch (_) {}

    ['/usr/bin/Rscript', '/usr/local/bin/Rscript', '/snap/bin/Rscript', '/opt/homebrew/bin/Rscript']
      .forEach(addCandidate);
    addCandidate('Rscript');
  }

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    try {
      const locator = process.platform === 'win32' ? 'where' : 'which';
      const out = execFileSync(locator, [candidate], { encoding: 'utf8' }).trim();
      const first = out.split(/\r?\n/).map(s => s.trim().replace(/^"|"$/g, '')).find(Boolean);
      if (first) return first;
    } catch (_) {}
  }

  return null;
}

function killProcessTree(pid) {
  if (!pid) return false;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return true;
    }
    process.kill(pid, 'SIGTERM');
    return true;
  } catch (_) {
    return false;
  }
}

function appendCityLog(cidadeDir, message) {
  try {
    if (!cidadeDir) return;
    if (!fs.existsSync(cidadeDir)) fs.mkdirSync(cidadeDir, { recursive: true });
    const logPath = path.join(cidadeDir, 'processamento.log');
    const ts = new Date().toISOString();
    fs.appendFileSync(logPath, `${ts} - ${message}\n`, 'utf8');
  } catch (_) {}
}

function getCidadePaths(nomeCidade) {
  const cidadeDir = path.join(__dirname, 'data', nomeCidade);
  return {
    cidadeDir,
    cancelPath: path.join(cidadeDir, 'cancel.flag'),
    pausePath: path.join(cidadeDir, 'pause.flag'),
    logPath: path.join(cidadeDir, 'processamento.log'),
    progressPath: path.join(cidadeDir, 'progress.json'),
    checkpointPath: path.join(cidadeDir, 'checkpoint_state.rds'),
    partialsDir: path.join(cidadeDir, 'resume_partials'),
    metaPath: path.join(cidadeDir, 'process_meta.json'),
    lockPath: path.join(cidadeDir, 'processing.lock')
  };
}

function getCidadeProcessStatus(nomeCidade) {
  const upper = String(nomeCidade || '').toUpperCase().trim();
  if (!upper) {
    return {
      completo: false,
      emProcessamento: false,
      pausado: false,
      podeRetomar: false,
      statusAtual: '',
      progressData: null
    };
  }

  const cidadeDir = path.join(__dirname, 'data', upper);
  const arquivosEsperados = [
    `cnpj_${upper}_ESTABELE.RData`,
    `cnpj_${upper}_EMPRECSV.RData`,
    `cnpj_${upper}_SOCIOCSV.RData`,
    `cnpj_${upper}.csv`,
    `cnpj_${upper}.RData`
  ];
  const completo = arquivosEsperados.every(f => fs.existsSync(path.join(cidadeDir, f)));

  const paths = getCidadePaths(upper);
  const progressData = readJsonSafe(paths.progressPath);
  const meta = readJsonSafe(paths.metaPath);
  const statusAtual = (progressData && progressData.status) ? String(progressData.status).toLowerCase() : '';
  const terminal = statusAtual === 'done' || statusAtual === 'cancelled' || statusAtual === 'failed';
  const runningPersistido = statusAtual === 'running' && fs.existsSync(paths.lockPath);
  const runningHeartbeat = isRecentProgressHeartbeat(progressData);
  const runningByMetaPid = isMetaProcessRunning(meta);
  const emProcessamento = !!processingJobs[upper] || runningPersistido || runningHeartbeat || runningByMetaPid;
  const pausado = !!progressData && statusAtual === 'paused';
  const checkpointAtivo = fs.existsSync(paths.checkpointPath) && !terminal;
  const podeRetomar = pausado || checkpointAtivo;

  return { completo, emProcessamento, pausado, podeRetomar, statusAtual, progressData };
}

function readJsonSafe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

function iniciarProcessamentoR({ nomeCidade, codigoCidade, resume }, res) {
  if (processingJobs[nomeCidade]) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: `Cidade ${nomeCidade} já está sendo processada.` }));
    return;
  }

  const paths = getCidadePaths(nomeCidade);
  if (!fs.existsSync(paths.cidadeDir)) fs.mkdirSync(paths.cidadeDir, { recursive: true });
  try { if (fs.existsSync(paths.cancelPath)) fs.unlinkSync(paths.cancelPath); } catch (_) {}
  try { if (fs.existsSync(paths.pausePath)) fs.unlinkSync(paths.pausePath); } catch (_) {}
  try { if (fs.existsSync(paths.lockPath)) fs.unlinkSync(paths.lockPath); } catch (_) {}

  if (!resume) {
    try { fs.writeFileSync(paths.logPath, ''); } catch (_) {}
    try { if (fs.existsSync(paths.progressPath)) fs.unlinkSync(paths.progressPath); } catch (_) {}
    try { if (fs.existsSync(paths.checkpointPath)) fs.unlinkSync(paths.checkpointPath); } catch (_) {}
    try { if (fs.existsSync(paths.partialsDir)) fs.rmSync(paths.partialsDir, { recursive: true, force: true }); } catch (_) {}
  }

  const previousProgress = readJsonSafe(paths.progressPath) || null;

  delete progressCache[nomeCidade];
  const rscriptBin = resolveRscriptBinary();
  if (!rscriptBin) {
    appendCityLog(paths.cidadeDir, '[ERRO] Rscript não encontrado no sistema.');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Rscript não encontrado no sistema. Instale o R (componente Rscript) ou ajuste o PATH.' }));
    return;
  }

  const rScript = path.join(__dirname, 'dados_abertos.R');
  const rProcess = spawn(rscriptBin, [rScript], {
    cwd: __dirname,
    env: {
      ...process.env,
      CIDADE_CODIGO: codigoCidade,
      CIDADE_NOME: nomeCidade,
      RESUME_FROM_CHECKPOINT: resume ? '1' : '0'
    },
    detached: process.platform === 'win32',
    windowsHide: true
  });

  let respostaEnviada = false;
  rProcess.once('spawn', () => {
    const baselinePercent = Number.isFinite(previousProgress && previousProgress.percent)
      ? Math.max(0, Math.min(100, previousProgress.percent))
      : 0;
    writeJsonSafe(paths.progressPath, {
      status: 'running',
      stage: resume ? 'RETOMANDO' : 'INICIANDO',
      current_file: '',
      percent: baselinePercent,
      updated_at: new Date().toISOString()
    });
    processingJobs[nomeCidade] = {
      process: rProcess,
      pid: rProcess.pid,
      startedAt: new Date().toISOString(),
      codigo: codigoCidade,
      cidadeDir: paths.cidadeDir
    };
    try { fs.writeFileSync(paths.lockPath, String(rProcess.pid || '')); } catch (_) {}
    appendCityLog(paths.cidadeDir, resume
      ? `[RETOMADA] Retomado processamento (PID ${rProcess.pid}) para ${nomeCidade}`
      : `Iniciado processamento (PID ${rProcess.pid}) para ${nomeCidade}`);
    writeJsonSafe(paths.metaPath, {
      nomeCidade,
      codigoCidade,
      pid: rProcess.pid,
      lastPid: rProcess.pid,
      startedAt: new Date().toISOString(),
      lastAction: resume ? 'retomado' : 'iniciado'
    });
    if (!respostaEnviada) {
      respostaEnviada = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ iniciado: true, retomado: !!resume, nomeCidade, codigoCidade, pid: rProcess.pid }));
    }
  });

  rProcess.stdout.on('data', d => {
    const msg = String(d).trim();
    if (!msg) return;
    console.log(`[R ${nomeCidade}] ${msg}`);
    appendCityLog(paths.cidadeDir, `[STDOUT] ${msg}`);
  });
  rProcess.stderr.on('data', d => {
    const msg = String(d).trim();
    if (!msg) return;
    console.error(`[R ${nomeCidade}] ${msg}`);
    appendCityLog(paths.cidadeDir, `[STDERR] ${msg}`);
  });
  rProcess.on('error', err => {
    appendCityLog(paths.cidadeDir, `[ERRO_PROCESSO] ${err.message}`);
    try { if (fs.existsSync(paths.lockPath)) fs.unlinkSync(paths.lockPath); } catch (_) {}
    delete processingJobs[nomeCidade];
    delete progressCache[nomeCidade];
    if (!respostaEnviada) {
      respostaEnviada = true;
      const msg = err && err.code === 'ENOENT'
        ? 'Não foi possível iniciar o Rscript. Verifique a instalação do R no servidor.'
        : `Falha ao iniciar processamento: ${err.message}`;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: msg }));
    }
  });

  rProcess.on('close', code => {
    console.log(`[R ${nomeCidade}] encerrado com código ${code}`);
    appendCityLog(paths.cidadeDir, `Processo finalizado com código ${code}`);
    if (code !== 0 && !fs.existsSync(paths.cancelPath) && !fs.existsSync(paths.pausePath)) {
      try {
        fs.writeFileSync(paths.progressPath, JSON.stringify({
          status: 'failed',
          stage: 'ERRO',
          current_file: '',
          percent: 0,
          updated_at: new Date().toISOString()
        }));
      } catch (_) {}
    }
    try { if (fs.existsSync(paths.lockPath)) fs.unlinkSync(paths.lockPath); } catch (_) {}
    delete processingJobs[nomeCidade];
    delete progressCache[nomeCidade];
    const metaAtual = readJsonSafe(paths.metaPath) || {};
    writeJsonSafe(paths.metaPath, {
      ...metaAtual,
      nomeCidade,
      codigoCidade,
      pid: null,
      lastPid: null,
      finishedAt: new Date().toISOString(),
      lastAction: code === 0 ? 'finalizado' : 'encerrado_com_erro'
    });
  });
}

// Função para ler cache
function lerCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Erro ao ler cache:', e);
  }
  return {};
}

// Função para salvar cache
function salvarCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar cache:', e);
  }
}

function normalizeEnderecoCacheKey(endereco) {
  return String(endereco || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function cacheGetCoords(cache, endereco) {
  if (!cache || typeof cache !== 'object') return null;
  if (cache[endereco] && Number.isFinite(cache[endereco].lat) && Number.isFinite(cache[endereco].lon)) {
    return cache[endereco];
  }
  const normalized = normalizeEnderecoCacheKey(endereco);
  const found = cache[normalized];
  if (found && Number.isFinite(found.lat) && Number.isFinite(found.lon)) return found;
  return null;
}

function cacheIsKnownMiss(cache, endereco) {
  if (!cache || typeof cache !== 'object') return false;
  const isMissAtivo = (value) => {
    if (!(value === null || (value && value.failed === true))) return false;
    if (value && value.updatedAt) {
      const ts = Date.parse(String(value.updatedAt));
      if (Number.isFinite(ts)) {
        return (Date.now() - ts) < GEOCODE_KNOWN_MISS_COOLDOWN_MS;
      }
    }
    return true;
  };
  if (isMissAtivo(cache[endereco])) return true;
  const normalized = normalizeEnderecoCacheKey(endereco);
  if (!normalized) return false;
  return isMissAtivo(cache[normalized]);
}

function cacheSetCoords(cache, endereco, coords) {
  if (!cache || typeof cache !== 'object' || !coords) return;
  cache[endereco] = coords;
  const normalized = normalizeEnderecoCacheKey(endereco);
  if (normalized) cache[normalized] = coords;
}

function cacheSetKnownMiss(cache, endereco) {
  if (!cache || typeof cache !== 'object') return;
  const miss = { failed: true, updatedAt: new Date().toISOString() };
  cache[endereco] = miss;
  const normalized = normalizeEnderecoCacheKey(endereco);
  if (normalized) cache[normalized] = miss;
}

// Função para fazer requisição HTTPS
function fazerRequisicaoHttps(options) {
  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const isJson = data.trim().startsWith('{') || data.trim().startsWith('[');
          const parsed = isJson ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode || 0,
            data: parsed,
            raw: data,
            isJson
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode || 0,
            data: null,
            raw: data,
            isJson: false
          });
        }
      });
    }).on('error', reject);
  });
}

// Parsers de CSV simples (suportam campos com aspas e vírgulas internas)
function parseCSVRow(row) {
  const cols = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') { if (inQuote && row[i+1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { cols.push(cur); cur = ''; }
    else cur += c;
  }
  cols.push(cur);
  return cols;
}
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] || '').trim(); });
    result.push(obj);
  }
  return result;
}

function escapeCSVValue(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCoordsText(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parts = raw.split(',').map(v => v.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function extrairUfDoEndereco(endereco) {
  const text = String(endereco || '').toUpperCase();
  const match = text.match(/\/([A-Z]{2})\b/);
  return match ? match[1] : '';
}

function coordenadaPareceValidaParaUf(coords, uf) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return false;
  const brBounds = { minLat: -34.0, maxLat: 6.0, minLon: -74.5, maxLon: -28.0 };
  if (coords.lat < brBounds.minLat || coords.lat > brBounds.maxLat || coords.lon < brBounds.minLon || coords.lon > brBounds.maxLon) {
    return false;
  }

  const ufUpper = String(uf || '').toUpperCase().trim();
  const bounds = UF_BOUNDS[ufUpper];
  if (!bounds) return true;

  const margem = 0.8;
  return coords.lat >= (bounds.minLat - margem)
    && coords.lat <= (bounds.maxLat + margem)
    && coords.lon >= (bounds.minLon - margem)
    && coords.lon <= (bounds.maxLon + margem);
}

function coordenadaCompatívelComEndereco(coords, endereco) {
  const uf = extrairUfDoEndereco(endereco);
  return coordenadaPareceValidaParaUf(coords, uf);
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function coordenadaCompatívelComCentroCidade(coords, centro, maxKm = GEOCODE_CITY_DISTANCE_MAX_KM) {
  if (!coords || !centro) return true;
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return false;
  if (!Number.isFinite(centro.lat) || !Number.isFinite(centro.lon)) return true;
  const distancia = calcularDistanciaKm(coords.lat, coords.lon, centro.lat, centro.lon);
  return Number.isFinite(distancia) ? (distancia <= maxKm) : true;
}

function formatCoordsText(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return '';
  return `${Number(coords.lat).toFixed(6)},${Number(coords.lon).toFixed(6)}`;
}

function persistCityCoordsOnFactoryCsv(nomeCidade, coordsByEndereco) {
  try {
    const cidade = String(nomeCidade || '').toUpperCase().trim();
    if (!cidade || !coordsByEndereco || typeof coordsByEndereco !== 'object') {
      return { updated: 0, filePath: null };
    }

    const { fabricasCsvPath } = resolveCityDataPaths(cidade);
    if (!fs.existsSync(fabricasCsvPath)) {
      return { updated: 0, filePath: null };
    }

    const cacheByNormalizedAddress = new Map();
    for (const [endereco, coords] of Object.entries(coordsByEndereco)) {
      if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) continue;
      const normalized = normalizeEnderecoCacheKey(endereco);
      if (!normalized) continue;
      cacheByNormalizedAddress.set(normalized, coords);
    }

    if (cacheByNormalizedAddress.size === 0) {
      return { updated: 0, filePath: fabricasCsvPath };
    }

    const raw = fs.readFileSync(fabricasCsvPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    if (!lines.length || !lines[0].trim()) {
      return { updated: 0, filePath: fabricasCsvPath };
    }

    const headers = parseCSVRow(lines[0]).map(h => String(h || '').trim());
    let coordIndex = headers.findIndex(h => h.toLowerCase() === 'coordenadas');
    let addedCoordColumn = false;
    if (coordIndex < 0) {
      headers.push('coordenadas');
      coordIndex = headers.length - 1;
      addedCoordColumn = true;
    }

    let updated = 0;
    const outputLines = [headers.map(escapeCSVValue).join(',')];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      const values = parseCSVRow(line);
      while (values.length < headers.length) values.push('');

      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const enderecoRow = String(row.gps || row.endereco || '').trim();
      const normalizedEndereco = normalizeEnderecoCacheKey(enderecoRow);
      const coords = normalizedEndereco ? cacheByNormalizedAddress.get(normalizedEndereco) : null;
      if (coords) {
        const currentCoords = parseCoordsText(row.coordenadas);
        if (!currentCoords) {
          values[coordIndex] = formatCoordsText(coords);
          updated++;
        }
      }

      outputLines.push(values.slice(0, headers.length).map(escapeCSVValue).join(','));
    }

    if (updated > 0 || addedCoordColumn) {
      fs.writeFileSync(fabricasCsvPath, outputLines.join('\n') + '\n', 'utf8');
      const nomeUpper = cidade.toUpperCase();
      delete cityDataCache[nomeUpper];
    }

    return { updated, filePath: fabricasCsvPath };
  } catch (e) {
    console.warn('Aviso ao persistir coordenadas no CSV da cidade:', e.message);
    return { updated: 0, filePath: null, error: e.message };
  }
}

function resolveCityDataPaths(nomeCidade) {
  const cidadeDir = path.join(__dirname, 'data', nomeCidade);
  const cidadeSlug = slugCidade(nomeCidade);
  const fabricasCsvPath = path.join(cidadeDir, `fabricas_${cidadeSlug}.csv`);
  const cnpjCsvPath = path.join(cidadeDir, `cnpj_${nomeCidade}.csv`);
  const hasFactoryFile = fs.existsSync(fabricasCsvPath);
  const csvPath = hasFactoryFile ? fabricasCsvPath : cnpjCsvPath;
  return { cidadeDir, cidadeSlug, fabricasCsvPath, cnpjCsvPath, csvPath, hasFactoryFile };
}

function buildCityDatasetFromCsv(csvPath, sourceIsFactory) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const parsedRows = parseCSV(content);
  const rows = sourceIsFactory ? parsedRows : parsedRows.filter(isFactoryRow);
  const stripHash = v => (v || '').replace(/^#\s*/, '');
  const melhoresPorCnpj = new Map();

  const extrairBairroLegado = (enderecoLegado) => {
    const texto = String(enderecoLegado || '').trim();
    if (!texto) return '';

    const matchDireto = texto.match(/\bNA\s+(.+)$/i);
    if (matchDireto && matchDireto[1]) {
      return matchDireto[1].replace(/\s+/g, ' ').trim();
    }

    const matchTail = texto.match(/\/[A-Z]{2}\s+(.+)$/i);
    if (!matchTail || !matchTail[1]) return '';

    let tail = matchTail[1]
      .replace(/\s+/g, ' ')
      .replace(/^\s*[-,]+\s*/, '')
      .trim();
    if (!tail) return '';

    tail = tail.replace(/\b(LOTE|KM|GALPAO|SALA|LETRA|UNIDADE|UNIDADES|PARTE|PISO|BLOCO|CASA|APT|APTO|CJ)\b[^A-Z]*/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!tail) return '';

    const tokens = tail.split(' ').filter(t => /^[A-Z][A-Z0-9-]*$/i.test(t));
    if (!tokens.length) return '';

    const maxTokens = Math.min(4, tokens.length);
    const bairro = tokens.slice(tokens.length - maxTokens).join(' ').trim();
    if (!bairro || /^NA$/i.test(bairro)) return '';
    return bairro;
  };

  const scoreRegistro = (registro) => {
    let score = 0;
    if (registro.bairro && !/^NA$/i.test(registro.bairro)) score += 100;
    if (registro.numero && !/^NA$/i.test(registro.numero)) score += 8;
    if (registro.cep && !/^NA$/i.test(registro.cep)) score += 6;
    if (registro.endereco) score += 4;
    if (registro.telefone && !/^\(NA\)\s*NA$/i.test(registro.telefone)) score += 2;
    if (registro.coordenadas && Number.isFinite(registro.coordenadas.lat) && Number.isFinite(registro.coordenadas.lon)) score += 10;
    return score;
  };

  for (const r of rows) {
    const cnpj = stripHash(r.cnpj || r.id_cnpj || '').replace(/\D/g, '');
    if (!cnpj) continue;
    const capitalStr = stripHash(r.capital || '0').replace(',', '.');
    const capital = parseFloat(capitalStr) || 0;
    const enderecoBase = String(r.gps || r.endereco || '').trim();
    const enderecoNormalizado = enderecoBase
      .replace(/-\s*NA\s*\//gi, '- CIDADE_ESCOLHIDA/')
      .replace(/\bNA\s*\//gi, 'CIDADE_ESCOLHIDA/');
    const numero = stripHash(r.numero || r.V16 || '').trim();
    const bairroLegado = extrairBairroLegado(r.endereco || '');
    const bairro = stripHash(r.bairro || r.V18 || bairroLegado || '').trim();
    const cep = stripHash(r.cep || r.V19 || '').trim();
    const municipio = stripHash(r.municipio || r.cidade || '').trim();
    const ufEndereco = extrairUfDoEndereco(enderecoBase || enderecoNormalizado || r.gps || r.endereco || '');
    let coordenadas = parseCoordsText(r.coordenadas || '');
    if (coordenadas && !coordenadaPareceValidaParaUf(coordenadas, ufEndereco)) {
      coordenadas = null;
    }

    const registro = {
      cnpj,
      nome: r.razao_social || r.nome || '',
      endereco: enderecoNormalizado,
      numero,
      bairro,
      cep,
      municipio,
      telefone: r.telefone || '',
      whatsapp: r.whats || '',
      coordenadas,
      capital,
      porte: r.porte || '',
      ramo: stripHash(r.ramo || '')
    };

    const atual = melhoresPorCnpj.get(cnpj);
    if (!atual || scoreRegistro(registro) > scoreRegistro(atual)) {
      melhoresPorCnpj.set(cnpj, registro);
    }
  }

  return Array.from(melhoresPorCnpj.values());
}

function getCityDataset(nomeCidade) {
  const { csvPath, fabricasCsvPath } = resolveCityDataPaths(nomeCidade);
  if (!fs.existsSync(csvPath)) {
    return { error: `Dados não encontrados para ${nomeCidade}` };
  }

  const stat = fs.statSync(csvPath);
  const cacheKey = `${csvPath}|${stat.mtimeMs}|${stat.size}`;
  const cached = cityDataCache[nomeCidade];
  if (cached && cached.key === cacheKey) {
    return { data: cached.data, total: cached.total, fromCache: true };
  }

  const sourceIsFactory = fs.existsSync(fabricasCsvPath) && csvPath === fabricasCsvPath;
  const cidadeNomeFormatada = String(nomeCidade || '').trim();
  const data = buildCityDatasetFromCsv(csvPath, sourceIsFactory).map(item => {
    const endereco = String(item.endereco || '').replace(/CIDADE_ESCOLHIDA/g, cidadeNomeFormatada);
    return { ...item, endereco };
  });
  cityDataCache[nomeCidade] = {
    key: cacheKey,
    data,
    total: data.length,
    cachedAt: Date.now()
  };

  return { data, total: data.length, fromCache: false };
}

function buildGeocodeQueryCandidates(enderecoRaw) {
  const original = String(enderecoRaw || '').trim();
  if (!original) return [];

  const addBrazil = (value) => {
    const base = String(value || '').trim().replace(/,+$/g, '').trim();
    if (!base) return '';
    return /\bBRASIL\b/i.test(base) ? base : `${base}, BRASIL`;
  };

  const normalized = original
    .replace(/\bS\/?N\b/gi, ' ')
    .replace(/\bNA\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .trim();

  let cidade = '';
  let uf = '';
  let head = original;
  const cityUfMatch = original.match(/-\s*([^-/,]+(?:\s+[^-/,]+)*)\s*\/\s*([A-Z]{2})\b/i);
  if (cityUfMatch) {
    cidade = cityUfMatch[1].trim();
    uf = cityUfMatch[2].toUpperCase();
    head = original.slice(0, cityUfMatch.index).trim().replace(/[\-,\s]+$/g, '').trim();
  }

  const parts = head.split(',').map(v => v.trim()).filter(Boolean);
  const logradouro = parts[0] || '';
  const bairro = parts.length >= 2 ? parts[parts.length - 1] : '';

  const candidates = [];
  const pushCandidate = (value) => {
    const q = addBrazil(value);
    if (!q) return;
    if (!candidates.includes(q)) candidates.push(q);
  };

  pushCandidate(original);
  if (normalized && normalized !== original) pushCandidate(normalized);

  if (head && cidade) pushCandidate(`${head}, ${cidade}${uf ? `, ${uf}` : ''}`);
  if (logradouro && cidade) pushCandidate(`${logradouro}, ${cidade}${uf ? `, ${uf}` : ''}`);
  if (bairro && cidade && bairro.toUpperCase() !== logradouro.toUpperCase()) {
    pushCandidate(`${bairro}, ${cidade}${uf ? `, ${uf}` : ''}`);
  }
  if (cidade) pushCandidate(`${cidade}${uf ? `, ${uf}` : ''}`);

  return candidates;
}

function normalizeLocationText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extrairCidadeUfEsperados(enderecoRaw) {
  const original = String(enderecoRaw || '').trim();
  if (!original) return { cidade: '', uf: '' };
  const cityUfMatch = original.match(/-\s*([^-/,]+(?:\s+[^-/,]+)*)\s*\/\s*([A-Z]{2})\b/i);
  if (!cityUfMatch) return { cidade: '', uf: '' };
  return {
    cidade: normalizeLocationText(cityUfMatch[1]),
    uf: String(cityUfMatch[2] || '').toUpperCase()
  };
}

function inferirUfFromParts({ stateCode = '', iso = '', state = '' } = {}) {
  const sc = String(stateCode || '').toUpperCase().trim();
  if (/^[A-Z]{2}$/.test(sc)) return sc;

  const isoText = String(iso || '').toUpperCase().trim();
  const isoMatch = isoText.match(/BR-([A-Z]{2})/);
  if (isoMatch) return isoMatch[1];

  const stateNorm = normalizeLocationText(state);
  return UF_BY_STATE_NAME[stateNorm] || '';
}

function textoIncluiCidadeEsperada(texto, cidadeEsperada) {
  const t = normalizeLocationText(texto);
  const c = normalizeLocationText(cidadeEsperada);
  if (!t || !c) return false;
  return t.includes(c) || c.includes(t);
}

function pontuarResultadoNominatim(result, esperado) {
  if (!result || typeof result !== 'object') return -999;
  const expectedCity = normalizeLocationText(esperado && esperado.cidade);
  const expectedUf = String((esperado && esperado.uf) || '').toUpperCase().trim();
  if (!expectedCity && !expectedUf) return 1;

  const address = (result.address && typeof result.address === 'object') ? result.address : {};
  const cityFields = [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.city_district,
    address.county
  ].filter(Boolean);
  const cityMatched = cityFields.some(c => textoIncluiCidadeEsperada(c, expectedCity))
    || textoIncluiCidadeEsperada(result.display_name || '', expectedCity);
  const hasCityInfo = cityFields.length > 0 || !!String(result.display_name || '').trim();

  const detectedUf = inferirUfFromParts({
    stateCode: address.state_code,
    iso: address['ISO3166-2-lvl4'] || address['ISO3166-2-lvl3'],
    state: address.state
  });
  const ufMatched = expectedUf ? (detectedUf === expectedUf || String(result.display_name || '').toUpperCase().includes(` ${expectedUf},`)) : true;
  const hasUfInfo = !!detectedUf || !!String(address.state || '').trim();

  let score = 0;
  if (expectedCity) {
    if (cityMatched) score += 60;
    else if (hasCityInfo) score -= 20;
  }
  if (expectedUf) {
    if (ufMatched) score += 50;
    else if (hasUfInfo) score -= 200;
  }

  return score;
}

function pontuarResultadoPhoton(feature, esperado) {
  if (!feature || typeof feature !== 'object') return -999;
  const expectedCity = normalizeLocationText(esperado && esperado.cidade);
  const expectedUf = String((esperado && esperado.uf) || '').toUpperCase().trim();
  if (!expectedCity && !expectedUf) return 1;

  const props = (feature.properties && typeof feature.properties === 'object') ? feature.properties : {};
  const cityFields = [props.city, props.locality, props.county, props.district].filter(Boolean);
  const cityMatched = cityFields.some(c => textoIncluiCidadeEsperada(c, expectedCity));
  const hasCityInfo = cityFields.length > 0;

  const detectedUf = inferirUfFromParts({ state: props.state, stateCode: props.statecode });
  const ufMatched = expectedUf ? (detectedUf === expectedUf) : true;
  const hasUfInfo = !!detectedUf || !!String(props.state || '').trim();

  let score = 0;
  if (expectedCity) {
    if (cityMatched) score += 55;
    else if (hasCityInfo) score -= 20;
  }
  if (expectedUf) {
    if (ufMatched) score += 45;
    else if (hasUfInfo) score -= 180;
  }
  return score;
}

async function geocodificarViaPhoton(queryText, expectedLocation = null) {
  try {
    const query = encodeURIComponent(String(queryText || '').trim());
    if (!query) return { coords: null, temporaryFailure: false };

    const options = {
      hostname: 'photon.komoot.io',
      path: `/api/?q=${query}&limit=5`,
      timeout: 12000,
      headers: {
        'User-Agent': 'factorsMap/1.0 (contato-local)',
        'Accept': 'application/json'
      }
    };

    const response = await fazerRequisicaoHttps(options);
    const statusCode = Number(response && response.statusCode) || 0;
    if (statusCode === 429 || statusCode >= 500 || statusCode === 0) {
      return { coords: null, temporaryFailure: true };
    }

    const data = response && response.data;
    const features = data && Array.isArray(data.features) ? data.features : [];
    if (!features.length) return { coords: null, temporaryFailure: false };

    let escolhido = null;
    let melhorScore = -Infinity;
    for (const feature of features) {
      const score = pontuarResultadoPhoton(feature, expectedLocation || {});
      if (score > melhorScore) {
        melhorScore = score;
        escolhido = feature;
      }
    }

    const temValidacaoEstrita = !!(expectedLocation && (expectedLocation.cidade || expectedLocation.uf));
    const scoreMinimoAceitavel = temValidacaoEstrita ? 5 : 0;
    if (!escolhido || melhorScore < scoreMinimoAceitavel) return { coords: null, temporaryFailure: false };

    const geometry = escolhido.geometry;
    const coords = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    if (!coords || coords.length < 2) return { coords: null, temporaryFailure: false };

    const lon = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { coords: null, temporaryFailure: false };
    }
    return { coords: { lat, lon }, temporaryFailure: false };
  } catch (_) {
    return { coords: null, temporaryFailure: true };
  }
}

// Função para geocodificar um endereço
async function geocodificar(endereco) {
  const queries = buildGeocodeQueryCandidates(endereco);
  if (!queries.length) return { coords: null, temporaryFailure: false };
  const expectedLocation = extrairCidadeUfEsperados(endereco);
  const temValidacaoEstrita = !!(expectedLocation && (expectedLocation.cidade || expectedLocation.uf));
  const scoreMinimoAceitavel = temValidacaoEstrita ? 0 : 0;

  let hadTemporaryFailure = false;
  for (const queryText of queries) {
    try {
      const query = encodeURIComponent(queryText);
      const options = {
        hostname: 'nominatim.openstreetmap.org',
        path: `/search?format=json&addressdetails=1&countrycodes=br&q=${query}&limit=5`,
        timeout: 12000,
        headers: {
          'User-Agent': 'factorsMap/1.0 (contato-local)',
          'Accept': 'application/json'
        }
      };

      const response = await fazerRequisicaoHttps(options);
      const statusCode = Number(response && response.statusCode) || 0;
      if (statusCode === 429 || statusCode >= 500 || statusCode === 0) {
        hadTemporaryFailure = true;
        break;
      }

      const data = response && response.data;
      if (Array.isArray(data) && data.length > 0) {
        let escolhido = null;
        let melhorScore = -Infinity;
        for (const item of data) {
          const score = pontuarResultadoNominatim(item, expectedLocation);
          if (score > melhorScore) {
            melhorScore = score;
            escolhido = item;
          }
        }

        if (escolhido && melhorScore >= scoreMinimoAceitavel) {
          const lat = parseFloat(escolhido.lat);
          const lon = parseFloat(escolhido.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { coords: { lat, lon }, temporaryFailure: false };
          }
        }

        if (!expectedLocation.cidade && !expectedLocation.uf) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { coords: { lat, lon }, temporaryFailure: false };
          }
        }
      }
    } catch (e) {
      hadTemporaryFailure = true;
      console.error('Erro ao geocodificar:', endereco, e.message);
    }
  }

  // Fallback secundário: Photon (útil quando Nominatim está limitando ou não resolve forma específica)
  for (const queryText of queries.slice(0, 3)) {
    const photonResult = await geocodificarViaPhoton(queryText, expectedLocation);
    if (photonResult && photonResult.coords) {
      return photonResult;
    }
    if (photonResult && photonResult.temporaryFailure) {
      hadTemporaryFailure = true;
    }
  }

  return { coords: null, temporaryFailure: hadTemporaryFailure };
}

// Função para servir arquivo estático
function servirArquivo(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Arquivo não encontrado');
      return;
    }
    
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.json') contentType = 'application/json';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Função para ler body da requisição
function lerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Criar servidor HTTP
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API: Geocodificar todos os endereços
  if (pathname === '/api/geocodificar-todos' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const { enderecos, nomeCidade } = body;
      const retryFailed = !!body.retryFailed;
      const forceRefresh = !!body.forceRefresh;
      
      if (!Array.isArray(enderecos)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'enderecos deve ser um array' }));
        return;
      }

      let cache = lerCache();
      const resultado = {};
      let cacheWritesCount = 0;
      let skippedKnownMissCount = 0;
      let temporaryFailureCount = 0;
      const centroCidadeMemo = new Map();

      const obterCentroCidade = async (cidadeRef, ufRef = '') => {
        const cidade = String(cidadeRef || '').trim().toUpperCase();
        const uf = String(ufRef || '').trim().toUpperCase();
        if (!cidade) return null;
        const memoKey = `${cidade}|${uf}`;
        if (centroCidadeMemo.has(memoKey)) return centroCidadeMemo.get(memoKey);

        const cacheKey = `__CIDADE__${cidade}${uf ? `_${uf}` : ''}`;
        const cachedCenter = cache[cacheKey];
        if (cachedCenter && Number.isFinite(cachedCenter.lat) && Number.isFinite(cachedCenter.lon)) {
          centroCidadeMemo.set(memoKey, cachedCenter);
          return cachedCenter;
        }

        const queryCidade = uf ? `${cidade}, ${uf}, BRASIL` : `${cidade}, BRASIL`;
        const geocodeResult = await geocodificar(queryCidade);
        const coords = geocodeResult && geocodeResult.coords ? geocodeResult.coords : null;
        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
          cache[cacheKey] = coords;
          cacheWritesCount++;
          centroCidadeMemo.set(memoKey, coords);
          return coords;
        }
        centroCidadeMemo.set(memoKey, null);
        return null;
      };

      const coordenadaValidaParaContexto = async (coords, endereco) => {
        if (!coordenadaCompatívelComEndereco(coords, endereco)) return false;

        const esperado = extrairCidadeUfEsperados(endereco);
        const cidadeEndereco = String((esperado && esperado.cidade) || '').trim().toUpperCase();
        const ufEndereco = String((esperado && esperado.uf) || '').trim().toUpperCase();
        const cidadeFallback = String(nomeCidade || '').trim().toUpperCase();
        const cidadeRef = cidadeEndereco || cidadeFallback;
        if (!cidadeRef) return true;

        const centro = await obterCentroCidade(cidadeRef, ufEndereco);
        return coordenadaCompatívelComCentroCidade(coords, centro);
      };

      for (const endereco of enderecos) {
        const cached = forceRefresh ? null : cacheGetCoords(cache, endereco);
        if (cached && !forceRefresh) {
          if (await coordenadaValidaParaContexto(cached, endereco)) {
            resultado[endereco] = cached;
          } else {
            cacheSetKnownMiss(cache, endereco);
            cacheWritesCount++;
          }
        } else if (!forceRefresh && !retryFailed && cacheIsKnownMiss(cache, endereco)) {
          skippedKnownMissCount++;
        } else {
          console.log(`🔍 Geocodificando: ${endereco}`);
          let geocodeResult = null;
          for (let attempt = 0; attempt <= GEOCODE_TEMP_MAX_RETRIES; attempt++) {
            geocodeResult = await geocodificar(endereco);
            const gotCoords = !!(geocodeResult && geocodeResult.coords);
            const temporaryFailure = !!(geocodeResult && geocodeResult.temporaryFailure);
            if (gotCoords || !temporaryFailure || attempt >= GEOCODE_TEMP_MAX_RETRIES) break;
            const waitMs = GEOCODE_TEMP_RETRY_DELAY_MS * (attempt + 1);
            console.log(`⏳ Falha temporária (${attempt + 1}/${GEOCODE_TEMP_MAX_RETRIES + 1}). Retentando em ${waitMs}ms: ${endereco}`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }

          if (geocodeResult && geocodeResult.coords) {
            if (await coordenadaValidaParaContexto(geocodeResult.coords, endereco)) {
              resultado[endereco] = geocodeResult.coords;
              cacheSetCoords(cache, endereco, geocodeResult.coords);
              cacheWritesCount++;
              console.log(`✅ ${endereco} => [${geocodeResult.coords.lat}, ${geocodeResult.coords.lon}]`);
            } else {
              console.log(`⚠️ Coordenada rejeitada por validação geográfica: ${endereco} => [${geocodeResult.coords.lat}, ${geocodeResult.coords.lon}]`);
              cacheSetKnownMiss(cache, endereco);
              cacheWritesCount++;
            }
          } else {
            if (geocodeResult && geocodeResult.temporaryFailure) {
              temporaryFailureCount++;
              console.log(`⏳ Falha temporária no geocoding (sem cache de erro): ${endereco}`);
            } else {
              console.log(`❌ Falha ao geocodificar: ${endereco}`);
              cacheSetKnownMiss(cache, endereco);
              cacheWritesCount++;
            }
          }
          // Delay controlado para respeitar rate limiting sem penalizar demais cidades grandes
          await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY_MS));
        }
      }

      if (cacheWritesCount > 0) {
        salvarCache(cache);
        console.log(`\n📊 ${cacheWritesCount} atualização(ões) de cache (sucesso/falha) gravadas`);
      }
      if (skippedKnownMissCount > 0) {
        console.log(`⏭️ ${skippedKnownMissCount} endereço(s) com falha conhecida foram pulados (sem nova tentativa)`);
      }
      if (temporaryFailureCount > 0) {
        console.log(`⏳ ${temporaryFailureCount} endereço(s) tiveram falha temporária e ficaram pendentes para próxima rodada`);
      }

      if (typeof nomeCidade === 'string' && nomeCidade.trim()) {
        const persistInfo = persistCityCoordsOnFactoryCsv(nomeCidade, resultado);
        if (persistInfo && persistInfo.updated > 0) {
          console.log(`💾 Coordenadas persistidas em CSV da cidade: ${persistInfo.updated} linha(s)`);
        }
      }

      console.log(`📦 Retornando ${Object.keys(resultado).length} coordenadas`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resultado));
    } catch (e) {
      console.error('Erro ao processar geocodificação:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API: Geocodificar centro aproximado de uma cidade
  // GET /api/geocodificar-cidade?nome=PETROPOLIS
  if (pathname === '/api/geocodificar-cidade' && req.method === 'GET') {
    try {
      const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
      const uf = (parsedUrl.query.uf || '').toUpperCase().trim();
      if (!nomeCidade) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
        return;
      }

      const cache = lerCache();
      const cacheKey = `__CIDADE__${nomeCidade}${uf ? `_${uf}` : ''}`;
      if (cache[cacheKey] && Number.isFinite(cache[cacheKey].lat) && Number.isFinite(cache[cacheKey].lon)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cache[cacheKey]));
        return;
      }

      const queryCidade = uf ? `${nomeCidade}, ${uf}, BRASIL` : `${nomeCidade}, BRASIL`;
      const geocodeResult = await geocodificar(queryCidade);
      const coords = geocodeResult && geocodeResult.coords ? geocodeResult.coords : null;
      if (!coords) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: `Não foi possível geocodificar ${nomeCidade}` }));
        return;
      }

      cache[cacheKey] = coords;
      salvarCache(cache);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(coords));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Ver cache
  if (pathname === '/api/cache' && req.method === 'GET') {
    const cache = lerCache();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cache));
    return;
  }

  // API: Limpar cache
  if (pathname === '/api/limpar-cache' && req.method === 'DELETE') {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        console.log('Cache limpo');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: true, mensagem: 'Cache limpo' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: true, mensagem: 'Não havia cache para limpar' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Salvar logs do cliente
  if (pathname === '/api/logs' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const logsFile = path.join(__dirname, 'client-logs.json');
      
      // Salvar logs com timestamp
      const logEntry = {
        timestamp: new Date().toISOString(),
        logs: body
      };
      
      fs.writeFileSync(logsFile, JSON.stringify(logEntry, null, 2), 'utf8');
      console.log('📋 Logs do cliente salvos em client-logs.json');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sucesso: true }));
    } catch (e) {
      console.error('Erro ao salvar logs:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }



  // API: Status dos arquivos de uma cidade
  // GET /api/status-cidade?nome=NITEROI
  if (pathname === '/api/status-cidade' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    if (!nomeCidade) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
      return;
    }
    const cidadeDir = path.join(__dirname, 'data', nomeCidade);
    const arquivosEsperados = [
      `cnpj_${nomeCidade}_ESTABELE.RData`,
      `cnpj_${nomeCidade}_EMPRECSV.RData`,
      `cnpj_${nomeCidade}_SOCIOCSV.RData`,
      `cnpj_${nomeCidade}.csv`,
      `cnpj_${nomeCidade}.RData`
    ];
    const status = arquivosEsperados.map(f => ({
      arquivo: f,
      existe: fs.existsSync(path.join(cidadeDir, f))
    }));
    const info = getCidadeProcessStatus(nomeCidade);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      nomeCidade,
      completo: info.completo,
      emProcessamento: info.emProcessamento,
      pausado: info.pausado,
      podeRetomar: info.podeRetomar,
      status,
      progressData: info.progressData
    }));
    return;
  }

  // API: Lista de cidades já concluídas (processadas e finalizadas)
  // GET /api/cidades-concluidas
  if (pathname === '/api/cidades-concluidas' && req.method === 'GET') {
    const dataDir = path.join(__dirname, 'data');
    const cidades = [];
    try {
      const dirs = fs.existsSync(dataDir)
        ? fs.readdirSync(dataDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
        : [];

      for (const nomeCidade of dirs) {
        const upper = String(nomeCidade || '').toUpperCase().trim();
        if (!upper) continue;
        const info = getCidadeProcessStatus(upper);
        const concluida = info.completo
          && !info.emProcessamento
          && !info.podeRetomar
          && (info.statusAtual === 'done' || info.statusAtual === '');
        if (concluida) cidades.push(upper);
      }
    } catch (_) {}

    cidades.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ cidades }));
    return;
  }

  // API: Lista processamentos em curso/pausados para reconstruir UI do cliente
  // GET /api/processamentos
  if (pathname === '/api/processamentos' && req.method === 'GET') {
    const dataDir = path.join(__dirname, 'data');
    const items = [];
    try {
      const dirs = fs.existsSync(dataDir)
        ? fs.readdirSync(dataDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
        : [];

      for (const nomeCidade of dirs) {
        const upper = nomeCidade.toUpperCase();
        const paths = getCidadePaths(upper);
        const progressData = readJsonSafe(paths.progressPath);
        const meta = readJsonSafe(paths.metaPath);
        const lockAtivo = fs.existsSync(paths.lockPath);
        const statusAtual = (progressData && progressData.status) ? String(progressData.status).toLowerCase() : '';
        const terminal = statusAtual === 'done' || statusAtual === 'cancelled' || statusAtual === 'failed';
        const runningPersistido = statusAtual === 'running' && lockAtivo;
        const runningHeartbeat = isRecentProgressHeartbeat(progressData);
        const runningByMetaPid = isMetaProcessRunning(meta);
        const emProcessamento = !!processingJobs[upper] || runningPersistido || runningHeartbeat || runningByMetaPid;
        const checkpointExiste = fs.existsSync(paths.checkpointPath);
        const checkpointAtivo = checkpointExiste && !terminal;
        const pausado = (statusAtual === 'paused') || (!emProcessamento && checkpointAtivo && !statusAtual);
        const podeRetomar = (statusAtual === 'paused') || checkpointAtivo;
        const ativo = emProcessamento || podeRetomar;
        if (!ativo) continue;

        items.push({
          nomeCidade: upper,
          codigoCidade: (processingJobs[upper] && processingJobs[upper].codigo) || (meta && meta.codigoCidade) || null,
          pid: (processingJobs[upper] && processingJobs[upper].pid) || (meta && (meta.pid || meta.lastPid)) || null,
          emProcessamento,
          pausado,
          podeRetomar,
          progressData: progressData || null
        });
      }
    } catch (_) {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ itens: items }));
    return;
  }

  // API: Iniciar processamento de uma cidade via Rscript
  // POST /api/processar-cidade  { nome: "NITEROI", codigo: "5865" }
  if (pathname === '/api/processar-cidade' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const nomeCidade   = (body.nome   || '').toUpperCase().trim();
      const codigoCidade = (body.codigo || '').trim();
      const retomar = !!body.retomar;
      if (!nomeCidade || !codigoCidade) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Campos "nome" e "codigo" obrigatórios' }));
        return;
      }
      iniciarProcessamentoR({ nomeCidade, codigoCidade, resume: retomar }, res);
    } catch (e) {
      console.error('Erro ao iniciar processamento:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Pausar processamento (checkpoint para retomada)
  // POST /api/pausar-processamento { nome: "NITEROI" }
  if (pathname === '/api/pausar-processamento' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const nomeCidade = (body.nome || '').toUpperCase().trim();
      if (!nomeCidade) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Campo "nome" obrigatório' }));
        return;
      }
      if (!processingJobs[nomeCidade]) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: `Cidade ${nomeCidade} não está em processamento.` }));
        return;
      }
      const paths = getCidadePaths(nomeCidade);
      try { if (!fs.existsSync(paths.cidadeDir)) fs.mkdirSync(paths.cidadeDir, { recursive: true }); } catch (_) {}
      try { fs.writeFileSync(paths.pausePath, new Date().toISOString()); } catch (_) {}
      appendCityLog(paths.cidadeDir, '[PAUSA] Solicitação de pausa enviada. Aguardando ponto seguro para checkpoint...');
      delete progressCache[nomeCidade];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pausando: true, nomeCidade }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Retomar processamento a partir de checkpoint
  // POST /api/retomar-processamento { nome: "NITEROI", codigo: "5865" }
  if (pathname === '/api/retomar-processamento' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const nomeCidade = (body.nome || '').toUpperCase().trim();
      const codigoCidade = (body.codigo || '').trim();
      if (!nomeCidade || !codigoCidade) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Campos "nome" e "codigo" obrigatórios' }));
        return;
      }
      const paths = getCidadePaths(nomeCidade);
      if (!fs.existsSync(paths.checkpointPath)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: `Não há checkpoint de pausa para ${nomeCidade}.` }));
        return;
      }
      iniciarProcessamentoR({ nomeCidade, codigoCidade, resume: true }, res);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Progresso de uma cidade (lê progress.json com cache de 10 s)
  // GET /api/progresso-cidade?nome=NITEROI
  if (pathname === '/api/progresso-cidade' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    if (!nomeCidade) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
      return;
    }
    const now         = Date.now();
    const cached      = progressCache[nomeCidade];
    if (cached && (now - cached.timestamp) < 10000) {
      const cachedRunningHeartbeat = isRecentProgressHeartbeat(cached.data);
      const meta = readJsonSafe(getCidadePaths(nomeCidade).metaPath);
      const emAndamento = !!processingJobs[nomeCidade] || cachedRunningHeartbeat || isMetaProcessRunning(meta);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(Object.assign({}, cached.data, { emProcessamento: emAndamento })));
      return;
    }
    const cidadeDir    = path.join(__dirname, 'data', nomeCidade);
    const progressPath = path.join(cidadeDir, 'progress.json');
    let data = null;
    try { if (fs.existsSync(progressPath)) data = JSON.parse(fs.readFileSync(progressPath, 'utf8')); } catch (_) {}
    const runningHeartbeat = isRecentProgressHeartbeat(data);
    const meta = readJsonSafe(getCidadePaths(nomeCidade).metaPath);
    const emAndamento = !!processingJobs[nomeCidade] || runningHeartbeat || isMetaProcessRunning(meta);
    if (!data) data = { status: emAndamento ? 'running' : 'idle', nomeCidade };
    progressCache[nomeCidade] = { data, timestamp: now };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.assign({}, data, { emProcessamento: emAndamento })));
    return;
  }

  // API: Uso de recursos do sistema (CPU/RAM/GPU) para painel de processamento
  // GET /api/uso-recursos?nome=NITEROI
  if (pathname === '/api/uso-recursos' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    const usage = getSystemUsageSnapshot();
    const emAndamento = nomeCidade ? !!processingJobs[nomeCidade] : Object.keys(processingJobs).length > 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.assign({}, usage, {
      nomeCidade: nomeCidade || null,
      emProcessamento: emAndamento
    })));
    return;
  }

  // API: leitura incremental do log por cidade
  // GET /api/log-cidade?nome=NITEROI&offset=0
  if (pathname === '/api/log-cidade' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    let offset = parseInt(parsedUrl.query.offset || '0', 10);
    if (!nomeCidade) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
      return;
    }
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const cidadeDir = path.join(__dirname, 'data', nomeCidade);
    const logPath = path.join(cidadeDir, 'processamento.log');
    if (!fs.existsSync(logPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ nomeCidade, offset, nextOffset: offset, lines: [], hasMore: false }));
      return;
    }

    try {
      const buffer = fs.readFileSync(logPath);
      if (offset > buffer.length) offset = 0;
      const slice = buffer.slice(offset).toString('utf8');
      const lines = slice.split(/\r?\n/).filter(Boolean);
      const nextOffset = buffer.length;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        nomeCidade,
        offset,
        nextOffset,
        lines,
        hasMore: nextOffset > offset
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Cancelar processamento e limpar arquivos parciais
  // POST /api/cancelar-processamento  { nome: "NITEROI" }
  if (pathname === '/api/cancelar-processamento' && req.method === 'POST') {
    try {
      const body = await lerBody(req);
      const nomeCidade = (body.nome || '').toUpperCase().trim();
      if (!nomeCidade) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Campo "nome" obrigatório' }));
        return;
      }
      const cidadeDir    = path.join(__dirname, 'data', nomeCidade);
      const cidadeSlug   = slugCidade(nomeCidade);
      const cancelPath   = path.join(cidadeDir, 'cancel.flag');
      const pausePath    = path.join(cidadeDir, 'pause.flag');
      const checkpointPath = path.join(cidadeDir, 'checkpoint_state.rds');
      const partialsDir  = path.join(cidadeDir, 'resume_partials');
      const metaPath     = path.join(cidadeDir, 'process_meta.json');
      const lockPath     = path.join(cidadeDir, 'processing.lock');
      const progressPath = path.join(cidadeDir, 'progress.json');
      // 1. cancel.flag para o R parar graciosamente
      try { if (!fs.existsSync(cidadeDir)) fs.mkdirSync(cidadeDir, { recursive: true }); fs.writeFileSync(cancelPath, new Date().toISOString()); } catch (_) {}
      // 2. Matar apenas o processo da cidade solicitada
      const pidsEncerrados = [];
      const trackedJob = processingJobs[nomeCidade];
      if (trackedJob && trackedJob.pid && killProcessTree(trackedJob.pid)) {
        pidsEncerrados.push(trackedJob.pid);
      }
      delete processingJobs[nomeCidade];

      // 2.1 Fallback: PID persistido no meta da própria cidade
      const meta = readJsonSafe(metaPath);
      const metaPid = meta && parseInt(meta.pid || meta.lastPid, 10);
      if (Number.isFinite(metaPid) && metaPid > 0 && !pidsEncerrados.includes(metaPid) && killProcessTree(metaPid)) {
        pidsEncerrados.push(metaPid);
      }
      // 3. Escrever status cancelado
      try { fs.writeFileSync(progressPath, JSON.stringify({ status: 'cancelled', stage: 'CANCELADO', current_file: '', percent: 0, updated_at: new Date().toISOString() })); } catch (_) {}
      delete progressCache[nomeCidade];
      // 4. Remover lock
      try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch (_) {}
      try { if (fs.existsSync(pausePath)) fs.unlinkSync(pausePath); } catch (_) {}
      try { if (fs.existsSync(checkpointPath)) fs.unlinkSync(checkpointPath); } catch (_) {}
      try { if (fs.existsSync(partialsDir)) fs.rmSync(partialsDir, { recursive: true, force: true }); } catch (_) {}
      try { if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath); } catch (_) {}
      // 5. Apagar arquivos de saída parciais
      for (const f of [`cnpj_${nomeCidade}_ESTABELE.RData`, `cnpj_${nomeCidade}_EMPRECSV.RData`, `cnpj_${nomeCidade}_SOCIOCSV.RData`, `cnpj_${nomeCidade}.csv`, `cnpj_${nomeCidade}.RData`, `fabricas_${cidadeSlug}.csv`, `fabricas_${cidadeSlug}.RData`]) {
        try { const fp = path.join(cidadeDir, f); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ cancelado: true, nomeCidade, pidsEncerrados }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Retorna dados de uma cidade como JSON, lidos do CSV final
  // GET /api/dados-cidade?nome=NITEROI
  if (pathname === '/api/dados-cidade' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    if (!nomeCidade) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
      return;
    }
    const offsetRaw = parseInt(parsedUrl.query.offset, 10);
    const limitRaw = parseInt(parsedUrl.query.limit, 10);
    const hasPagination = parsedUrl.query.paginado === '1'
      || Number.isFinite(offsetRaw)
      || Number.isFinite(limitRaw);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 1000;

    const dataset = getCityDataset(nomeCidade);
    if (dataset.error) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: dataset.error }));
      return;
    }

    try {
      const dados = dataset.data;
      const cache = lerCache();
      const anexarCoordenadasCache = (lista) => {
        if (!Array.isArray(lista) || !lista.length) return [];
        return lista.map((item) => {
          if (!item || typeof item !== 'object') return item;
          const hasCoords = item.coordenadas
            && Number.isFinite(item.coordenadas.lat)
            && Number.isFinite(item.coordenadas.lon);
          if (hasCoords) return item;
          const cached = cacheGetCoords(cache, item.endereco);
          if (cached) return { ...item, coordenadas: cached, geocode_failed: false };
          if (cacheIsKnownMiss(cache, item.endereco)) return { ...item, geocode_failed: true };
          return item;
        });
      };
      const extrairMapaCoordenadas = (lista) => {
        const mapa = {};
        if (!Array.isArray(lista)) return mapa;
        for (const item of lista) {
          if (!item || !item.endereco || !item.coordenadas) continue;
          const { lat, lon } = item.coordenadas;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          mapa[item.endereco] = { lat, lon };
        }
        return mapa;
      };

      if (hasPagination) {
        const total = dataset.total;
        const items = anexarCoordenadasCache(dados.slice(offset, offset + limit));
        const mapaCoords = extrairMapaCoordenadas(items);
        if (Object.keys(mapaCoords).length > 0) {
          persistCityCoordsOnFactoryCsv(nomeCidade, mapaCoords);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          nomeCidade,
          total,
          offset,
          limit,
          count: items.length,
          hasMore: (offset + items.length) < total,
          items
        }));
        return;
      }

      const dataComCoords = anexarCoordenadasCache(dados);
      const mapaCoords = extrairMapaCoordenadas(dataComCoords);
      if (Object.keys(mapaCoords).length > 0) {
        persistCityCoordsOnFactoryCsv(nomeCidade, mapaCoords);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(dataComCoords));
    } catch (e) {
      console.error('Erro ao ler dados de cidade:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: e.message }));
    }
    return;
  }

  // API: Conselhos Populares de uma cidade (proxy para Spring Boot)
  // GET /api/conselhos-cidade?nome=NITEROI
  if (pathname === '/api/conselhos-cidade' && req.method === 'GET') {
    const nomeCidade = (parsedUrl.query.nome || '').toUpperCase().trim();
    if (!nomeCidade) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Parâmetro "nome" obrigatório' }));
      return;
    }
    const springUrl = `http://localhost:8080/api/map/conselhos?cidade=${encodeURIComponent(nomeCidade)}`;
    http.get(springUrl, (springRes) => {
      let data = '';
      springRes.on('data', chunk => { data += chunk; });
      springRes.on('end', () => {
        res.writeHead(springRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data);
      });
    }).on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Serviço indisponível: ' + e.message, conselhos: [] }));
    });
    return;
  }

  // API: Conselhos globais (estaduais, nacionais, continentais, internacionais)
  // GET /api/conselhos-globais
  if (pathname === '/api/conselhos-globais' && req.method === 'GET') {
    const springUrl = 'http://localhost:8080/api/map/conselhos-globais';
    http.get(springUrl, (springRes) => {
      let data = '';
      springRes.on('data', chunk => { data += chunk; });
      springRes.on('end', () => {
        res.writeHead(springRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data);
      });
    }).on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Serviço indisponível: ' + e.message, conselhos: [] }));
    });
    return;
  }

  // API: Salvar coordenadas de um conselho (proxy para Spring Boot)
  // PUT /api/conselhos-cidade/:id/coordenadas
  if (/^\/api\/conselhos-cidade\/(\d+)\/coordenadas$/.test(pathname) && req.method === 'PUT') {
    const match = pathname.match(/^\/api\/conselhos-cidade\/(\d+)\/coordenadas$/);
    const id = match[1];
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const springOptions = {
        hostname: 'localhost',
        port: 8080,
        path: `/api/map/conselhos/${id}/coordenadas`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      };
      const springReq = http.request(springOptions, (springRes) => {
        let data = '';
        springRes.on('data', chunk => { data += chunk; });
        springRes.on('end', () => {
          res.writeHead(springRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(data);
        });
      });
      springReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Serviço indisponível: ' + e.message }));
      });
      springReq.write(body);
      springReq.end();
    });
    return;
  }

  // Servir arquivos estáticos
  let filePath = path.join(__dirname, pathname);
  
  // Se for raiz, servir mapa_fabricas.html
  if (pathname === '/' || pathname === '') {
    filePath = path.join(__dirname, 'mapa_fabricas.html');
  }

  servirArquivo(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}/mapa_fabricas.html`);
  console.log(`📝 Cache salvo em: ${CACHE_FILE}`);
});
