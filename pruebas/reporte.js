// Genera el catálogo de casos y el informe de ejecución a partir de los resultados de las pruebas.
//   npm run test:reporte -- v1.3.1
// Entradas: pruebas/resultados/{api.xml, ui.json, tiempos-*.json, ui-metricas/*.json}, dist/, docs/calidad/defectos.md
// Salidas:  docs/calidad/casos/catalogo.md y docs/calidad/informes/<versión>.md
//           (si existe docs/calidad/informes/<versión>-conclusiones.md, se incluye al final del informe)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = path.resolve(__dirname, '..');
const RES = path.join(RAIZ, 'pruebas', 'resultados');
const CAL = path.join(RAIZ, 'docs', 'calidad');
const VERSION = process.argv[2] || 'sin-version';
const HOY = new Date().toISOString().slice(0, 10);

const leerJSON = (f, def = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

// ── Requisitos y módulos ──────────────────────────────────────
const RF = Array.from({ length: 23 }, (_, i) => `RF-${String(i + 1).padStart(2, '0')}`);
const MODULOS = {
  Inicio: ['RF-18', 'RF-21', 'RF-22', 'RF-23'], Supervisión: ['RF-19'], Equipos: ['RF-07'], Partidos: ['RF-12', 'RF-20'], Deportistas: ['RF-08', 'RF-09'],
  Entrenamientos: ['RF-10'], Asistencia: ['RF-11'], Estadísticas: ['RF-13'],
  Lesiones: ['RF-14'], Salud: ['RF-15'], Evaluaciones: ['RF-16'], Antropometría: ['RF-17'], Usuarios: ['RF-03'],
};

// ── Clasificación de los casos por su identificador ──────────
function clasificar(id) {
  const reglas = [
    [/^CP-UNI-00[1-7]/, 'Unitaria', 'Funcionalidad · Exactitud'],
    [/^CP-UNI-01\d/, 'Unitaria', 'Funcionalidad · Seguridad de acceso'],
    [/^CP-UNI/, 'Unitaria', 'Funcionalidad · Adecuación'],
    [/^CP-(AUT|PER)/, 'Integración', 'Funcionalidad · Seguridad de acceso'],
    [/^CP-MOD-01[23]/, 'Integración', 'Funcionalidad · Exactitud'],
    [/^CP-(MOD|DOR|INI)/, 'Integración', 'Funcionalidad · Adecuación'],
    [/^CP-CSV/, 'Integración', 'Funcionalidad · Interoperabilidad'],
    [/^CP-SEG-(00[1-3]|01[3-689]|020)/, 'Seguridad', 'Funcionalidad · Seguridad de acceso'],
    [/^CP-SEG/, 'Robustez', 'Fiabilidad · Tolerancia a fallos'],
    [/^CP-MIG/, 'Migración', 'Portabilidad · Instalabilidad y reemplazo'],
    [/^CP-UI-REC/, 'Sistema', 'Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad'],
    [/^CP-UI-COM/, 'Compatibilidad', 'Portabilidad · Adaptabilidad'],
    [/^CP-UI-MED/, 'Medición', 'Usabilidad / Eficiencia / Fiabilidad'],
    [/^CP-UI/, 'Sistema', 'Funcionalidad · Adecuación'],
  ];
  const r = reglas.find(([re]) => re.test(id)) || [null, 'Otro', '—'];
  return { tipo: r[1], caracteristica: r[2] };
}

function partesDelTitulo(titulo) {
  const id = (titulo.match(/CP-[A-Z]+(?:-[A-Z]+)?-\d{3}/) || [''])[0];
  const requisitos = titulo.match(/RN?F-\d{2}/g) || [];
  const nombre = titulo.replace(id, '').replace(/\[[^\]]+\]/g, '').replace('@compat', '').trim();
  return { id, requisitos, nombre };
}

// ── Resultados de API (JUnit de node:test) ───────────────────
function casosApi() {
  const xml = fs.existsSync(path.join(RES, 'api.xml')) ? fs.readFileSync(path.join(RES, 'api.xml'), 'utf8') : '';
  const casos = [];
  const re = /<testcase\s+([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const cuerpo = m[3] || '';
    const titulo = (attrs.match(/name="([^"]*)"/) || [])[1] || '';
    const archivo = path.relative(RAIZ, ((attrs.match(/file="([^"]*)"/) || [])[1] || '')).replace(/\\/g, '/');
    const todo = (cuerpo.match(/<skipped type="todo" message="([^"]*)"/) || [])[1];
    const fallo = /<failure/.test(cuerpo) || /failure="/.test(attrs);
    const decod = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    casos.push({ ...partesDelTitulo(decod(titulo)), archivo, navegadores: ['—'],
      estado: todo ? (fallo ? 'defecto' : 'aprobado') : (fallo ? 'fallido' : 'aprobado'), defecto: todo || null });
  }
  return casos;
}

// ── Resultados de navegador (JSON de Playwright) ─────────────
function casosUi() {
  const json = leerJSON(path.join(RES, 'ui.json'), { suites: [] });
  const porId = new Map();
  const recorrer = (suite, archivo) => {
    for (const spec of suite.specs || []) {
      const p = partesDelTitulo(spec.title);
      const actual = porId.get(p.id) || { ...p, archivo, navegadores: [], estados: [] };
      for (const t of spec.tests || []) {
        actual.navegadores.push(t.projectName);
        const ultimo = t.results?.[t.results.length - 1]?.status;
        actual.estados.push(ultimo === 'passed' ? 'aprobado' : ultimo === 'skipped' ? 'omitido' : 'fallido');
      }
      porId.set(p.id, actual);
    }
    for (const s of suite.suites || []) recorrer(s, archivo);
  };
  for (const s of json.suites || []) recorrer(s, `pruebas/ui/${s.title}`);
  return [...porId.values()].map(c => ({
    ...c, estado: c.estados.includes('fallido') ? 'fallido' : c.estados.every(e => e === 'omitido') ? 'omitido' : 'aprobado',
  }));
}

// ── Defectos ──────────────────────────────────────────────────
function defectos() {
  const md = fs.readFileSync(path.join(CAL, 'defectos.md'), 'utf8');
  return md.split('\n').filter(l => /^\| DEF-\d+/.test(l)).map(l => {
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    return { id: c[0], detectado: c[1], version: c[2], modulo: c[3], severidad: c[4], descripcion: c[5], estado: c[6], corregido: c[7], en: c[8] };
  });
}

// ── Mediciones ────────────────────────────────────────────────
const MET = path.join(RES, 'ui-metricas');
const medida = (n) => leerJSON(path.join(MET, `${n}.json`), null);

function tamanoBuild() {
  const dir = path.join(RAIZ, 'dist', 'assets');
  if (!fs.existsSync(dir)) return null;
  let bytes = 0;
  for (const f of fs.readdirSync(dir)) if (/\.(js|css)$/.test(f)) bytes += zlib.gzipSync(fs.readFileSync(path.join(dir, f))).length;
  return Math.round(bytes / 1024);
}

function p95ApiLectura() {
  const tiempos = fs.readdirSync(RES).filter(f => f.startsWith('tiempos-')).flatMap(f => leerJSON(path.join(RES, f), []));
  const ms = tiempos.filter(t => t.metodo === 'GET' && t.status < 400).map(t => t.ms).sort((a, b) => a - b);
  if (!ms.length) return null;
  return { p95: ms[Math.min(ms.length - 1, Math.ceil(ms.length * 0.95) - 1)], muestras: ms.length };
}

// Versiones publicadas (etiquetas vX.Y[.Z]) que tienen su entrada "## vX.Y" en el CHANGELOG
function trazabilidad() {
  let etiquetas = [];
  try {
    etiquetas = require('child_process').execSync('git tag', { cwd: RAIZ, encoding: 'utf8' })
      .split('\n').map(t => t.trim()).filter(t => /^v\d+\.\d+(\.\d+)?$/.test(t));
  } catch { return { valor: null, texto: 'sin git' }; }
  const changelog = fs.readFileSync(path.join(RAIZ, 'CHANGELOG.md'), 'utf8');
  const conEntrada = etiquetas.filter(t => new RegExp(`^## ${t.replace(/\./g, '\\.')}\\b`, 'm').test(changelog));
  return { valor: pct(conEntrada.length, etiquetas.length), texto: `${conEntrada.length} de ${etiquetas.length} versiones etiquetadas con entrada en CHANGELOG` };
}

// ── Cálculo de métricas ───────────────────────────────────────
function semaforo(valor, verde, amarillo, menorEsMejor = false) {
  if (valor === null || valor === undefined) return '⚪';
  if (menorEsMejor) return valor <= verde ? '🟢' : (amarillo !== null && valor <= amarillo ? '🟡' : '🔴');
  return valor >= verde ? '🟢' : (amarillo !== null && valor >= amarillo ? '🟡' : '🔴');
}

function calcular(casos, defs) {
  const ejecutados = casos.filter(c => c.estado !== 'omitido');
  const con = (re) => ejecutados.filter(c => re.test(c.id));
  const aprobados = (lista) => lista.filter(c => c.estado === 'aprobado').length;
  const funcionales = ejecutados.filter(c => /Funcionalidad · (Adecuación|Seguridad)/.test(clasificar(c.id).caracteristica) && !/^CP-SEG/.test(c.id));

  const rfCubiertos = RF.filter(rf => ejecutados.some(c => c.estado === 'aprobado' && c.requisitos.includes(rf)));
  const modulosCubiertos = Object.entries(MODULOS).filter(([, rfs]) => ejecutados.some(c => c.requisitos.some(r => rfs.includes(r)))).map(([m]) => m);
  const recorrido = fs.existsSync(MET) ? fs.readdirSync(MET).filter(f => f.startsWith('recorrido-')).flatMap(f => leerJSON(path.join(MET, f), [])) : [];
  const negados = recorrido.filter(r => !r.permitido);
  const acceso = con(/^CP-(PER|AUT-00[67])/);
  const robustez = con(/^CP-SEG-(00[4-9]|01[0-27])/);
  const inyeccion = con(/^CP-SEG-00[1-3]/);
  const navegadores = ['chromium', 'firefox', 'webkit'].filter(n => casos.some(c => c.navegadores?.includes(n)) &&
    casos.filter(c => c.navegadores?.includes(n)).every(c => c.estado !== 'fallido'));
  const acc = medida('accesibilidad') || [];
  const tact = medida('objetivos-tactiles') || [];
  const carga = medida('carga-4g') || [];
  const caida = medida('caida-servidor') || [];
  const cerrados = defs.filter(d => d.estado === 'Cerrado' && d.corregido);
  const mttr = cerrados.length ? cerrados.reduce((s, d) => s + (new Date(d.corregido) - new Date(d.detectado)) / 864e5, 0) / cerrados.length : null;
  const abiertos = defs.filter(d => d.estado === 'Abierto');
  const api = p95ApiLectura();
  const build = tamanoBuild();
  const noTodo = ejecutados.filter(c => c.estado !== 'defecto');
  const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

  const traza = trazabilidad();
  const M = (id, car, nombre, valor, texto, meta, sem) => ({ id, car, nombre, valor, texto, meta, sem });
  return [
    M('M-F1', 'Funcionalidad', 'Cobertura funcional', pct(rfCubiertos.length, RF.length), `${rfCubiertos.length} de ${RF.length} RF`, '≥ 90 %', semaforo(pct(rfCubiertos.length, RF.length), 90, 75)),
    M('M-F2', 'Funcionalidad', 'Casos funcionales aprobados', pct(aprobados(funcionales), funcionales.length), `${aprobados(funcionales)} de ${funcionales.length}`, '≥ 95 %', semaforo(pct(aprobados(funcionales), funcionales.length), 95, 85)),
    M('M-F3', 'Funcionalidad', 'Exactitud de cálculos', pct(aprobados(con(/^CP-(UNI-00[1-7]|MOD-01[23])/)), con(/^CP-(UNI-00[1-7]|MOD-01[23])/).length), `${aprobados(con(/^CP-(UNI-00[1-7]|MOD-01[23])/))} de ${con(/^CP-(UNI-00[1-7]|MOD-01[23])/).length} verificaciones`, '100 %', semaforo(pct(aprobados(con(/^CP-(UNI-00[1-7]|MOD-01[23])/)), con(/^CP-(UNI-00[1-7]|MOD-01[23])/).length), 100, 95)),
    M('M-F4', 'Funcionalidad', 'Control de acceso por rol', pct(aprobados(acceso) + negados.filter(r => r.destino === '/').length, acceso.length + negados.length), `${aprobados(acceso) + negados.filter(r => r.destino === '/').length} de ${acceso.length + negados.length} intentos rechazados`, '100 %', semaforo(pct(aprobados(acceso) + negados.filter(r => r.destino === '/').length, acceso.length + negados.length), 100, null)),
    M('M-F5', 'Funcionalidad', 'Resistencia a inyección', pct(aprobados(inyeccion), inyeccion.length), `${aprobados(inyeccion)} de ${inyeccion.length}`, '100 %', semaforo(pct(aprobados(inyeccion), inyeccion.length), 100, null)),
    M('M-F6', 'Funcionalidad', 'Importación CSV correcta', pct(aprobados(con(/^CP-CSV/)), con(/^CP-CSV/).length), `${aprobados(con(/^CP-CSV/))} de ${con(/^CP-CSV/).length} casos`, '100 %', semaforo(pct(aprobados(con(/^CP-CSV/)), con(/^CP-CSV/).length), 100, 95)),
    M('M-R1', 'Fiabilidad', 'Densidad de defectos abiertos', Math.round((abiertos.length / 13) * 100) / 100, `${abiertos.length} abiertos ÷ 13 módulos`, '≤ 1', semaforo(Math.round((abiertos.length / 13) * 100) / 100, 1, 2, true)),
    M('M-R2', 'Fiabilidad', 'Pruebas automáticas en verde', pct(aprobados(noTodo), noTodo.length), `${aprobados(noTodo)} de ${noTodo.length} (sin contar defectos conocidos)`, '100 %', semaforo(pct(aprobados(noTodo), noTodo.length), 100, null)),
    M('M-R3', 'Fiabilidad', 'Manejo de entradas inválidas', pct(aprobados(robustez), robustez.length), `${aprobados(robustez)} de ${robustez.length} casos`, '100 %', semaforo(pct(aprobados(robustez), robustez.length), 100, 90)),
    M('M-R4', 'Fiabilidad', 'Aviso y reintento sin servidor', pct(caida.filter(x => x.ok).length, caida.length), `${caida.filter(x => x.ok).length} de ${caida.length} pantallas`, '≥ 90 %', semaforo(pct(caida.filter(x => x.ok).length, caida.length), 90, 70)),
    M('M-U1', 'Usabilidad', 'Éxito de tareas sin ayuda', null, 'Pendiente: prueba con usuarios', '≥ 80 %', '⚪'),
    M('M-U2', 'Usabilidad', 'Tiempo por tarea clave', null, 'Pendiente: prueba con usuarios', '120 / 10 / 60 s', '⚪'),
    M('M-U3', 'Usabilidad', 'Satisfacción SUS', null, 'Pendiente: cuestionario SUS', '≥ 80', '⚪'),
    M('M-U4', 'Usabilidad', 'Objetivos táctiles de 44 px', pct(tact.reduce((s, x) => s + x.adecuados, 0), tact.reduce((s, x) => s + x.total, 0)), `${tact.reduce((s, x) => s + x.adecuados, 0)} de ${tact.reduce((s, x) => s + x.total, 0)} elementos`, '≥ 95 %', semaforo(pct(tact.reduce((s, x) => s + x.adecuados, 0), tact.reduce((s, x) => s + x.total, 0)), 95, 80)),
    M('M-U5', 'Usabilidad', 'Pantallas sin problemas graves de accesibilidad', pct(acc.filter(a => a.graves === 0).length, acc.length), `${acc.filter(a => a.graves === 0).length} de ${acc.length} pantallas`, '100 %', semaforo(pct(acc.filter(a => a.graves === 0).length, acc.length), 100, 80)),
    M('M-E1', 'Eficiencia', 'Tiempo de respuesta de la API (p95)', api?.p95 ?? null, api ? `${api.p95} ms (${api.muestras} lecturas)` : 'sin datos', '≤ 500 ms', semaforo(api?.p95 ?? null, 500, 1000, true)),
    M('M-E2', 'Eficiencia', 'Carga del inicio en 4G lento', mediana(carga.map(c => c.segundos)), carga.length ? `${mediana(carga.map(c => c.segundos))} s (mediana de ${carga.length})` : 'sin datos', '≤ 3 s', semaforo(mediana(carga.map(c => c.segundos)), 3, 5, true)),
    M('M-E3', 'Eficiencia', 'Tamaño de descarga (gzip)', build, build !== null ? `${build} KB` : 'sin build', '≤ 300 KB', semaforo(build, 300, 450, true)),
    M('M-M1', 'Mantenibilidad', 'Tiempo medio de corrección', mttr !== null ? Math.round(mttr * 10) / 10 : null, mttr !== null ? `${Math.round(mttr * 10) / 10} días (${cerrados.length} defectos cerrados)` : 'sin datos', '≤ 3 días', semaforo(mttr !== null ? Math.round(mttr * 10) / 10 : null, 3, 7, true)),
    M('M-M2', 'Mantenibilidad', 'Regresiones', ejecutados.filter(c => c.estado === 'fallido').length, `${ejecutados.filter(c => c.estado === 'fallido').length} casos que fallan sin defecto registrado`, '0', semaforo(ejecutados.filter(c => c.estado === 'fallido').length, 0, null, true)),
    M('M-M3', 'Mantenibilidad', 'Módulos con pruebas automáticas', pct(modulosCubiertos.length, 13), `${modulosCubiertos.length} de 13 módulos`, '≥ 80 %', semaforo(pct(modulosCubiertos.length, 13), 80, 60)),
    M('M-M4', 'Mantenibilidad', 'Trazabilidad de cambios', traza.valor, traza.texto, '100 %', semaforo(traza.valor, 100, 90)),
    M('M-P1', 'Portabilidad', 'Pantallas sin desborde', pct(recorrido.filter(r => r.desborde <= 0).length, recorrido.length), `${recorrido.filter(r => r.desborde <= 0).length} de ${recorrido.length} combinaciones`, '100 %', semaforo(pct(recorrido.filter(r => r.desborde <= 0).length, recorrido.length), 100, 95)),
    M('M-P2', 'Portabilidad', 'Navegadores compatibles', navegadores.length, `${navegadores.length} de 3 (${navegadores.join(', ') || 'ninguno'})`, '3 de 3', semaforo(navegadores.length, 3, 2)),
    M('M-P3', 'Portabilidad', 'Instalación desde cero', null, 'Pendiente: prueba de instalación', '100 % y ≤ 30 min', '⚪'),
    M('M-P4', 'Portabilidad', 'Migración sin pérdida', con(/^CP-MIG-002/).some(c => c.estado === 'aprobado') ? 100 : 0, con(/^CP-MIG-002/).some(c => c.estado === 'aprobado') ? 'sí' : 'no', 'sí', con(/^CP-MIG-002/).some(c => c.estado === 'aprobado') ? '🟢' : '🔴'),
  ];
}

const PESOS = { Funcionalidad: 0.25, Fiabilidad: 0.2, Usabilidad: 0.2, Mantenibilidad: 0.15, Portabilidad: 0.1, Eficiencia: 0.1 };

function puntajes(metricas) {
  const res = {};
  for (const car of Object.keys(PESOS)) {
    const medidas = metricas.filter(m => m.car === car && m.sem !== '⚪');
    const p = medidas.length ? (medidas.reduce((s, m) => s + (m.sem === '🟢' ? 1 : m.sem === '🟡' ? 0.5 : 0), 0) / medidas.length) * 100 : null;
    res[car] = { puntaje: p !== null ? Math.round(p) : null, medidas: medidas.length, total: metricas.filter(m => m.car === car).length };
  }
  const conDatos = Object.entries(res).filter(([, v]) => v.puntaje !== null);
  const sumaPesos = conDatos.reduce((s, [c]) => s + PESOS[c], 0);
  const indice = sumaPesos ? Math.round(conDatos.reduce((s, [c, v]) => s + v.puntaje * PESOS[c], 0) / sumaPesos) : null;
  return { res, indice };
}

// ── Escritura ────────────────────────────────────────────────
const ICONO = { aprobado: '✔ Aprobado', fallido: '✖ Fallido', defecto: '⚠ Falla conocida', omitido: '— Omitido' };

function escribirCatalogo(casos) {
  const filas = casos.sort((a, b) => a.id.localeCompare(b.id)).map(c => {
    const k = clasificar(c.id);
    const estado = ICONO[c.estado] + (c.defecto ? ` (${c.defecto})` : '');
    return `| ${c.id} | ${c.nombre} | ${c.requisitos.join(', ') || '—'} | ${k.tipo} | ${k.caracteristica} | \`${c.archivo}\` | ${c.navegadores.filter(n => n !== '—').join(', ') || '—'} | ${estado} |`;
  });
  const md = `# Catálogo de casos de prueba

Generado automáticamente por \`npm run test:reporte\` el ${HOY} (versión ${VERSION}). No editar a mano: los casos se definen en \`pruebas/\` y su detalle (precondiciones, datos, pasos y resultado esperado) está en el código de cada prueba, bajo el identificador indicado.

Casos manuales (usabilidad e instalación): ver \`casos/manuales.md\`.

| ID | Caso | Requisitos | Tipo | Característica ISO 9126 | Archivo | Navegadores | Último resultado |
|---|---|---|---|---|---|---|---|
${filas.join('\n')}
`;
  fs.mkdirSync(path.join(CAL, 'casos'), { recursive: true });
  fs.writeFileSync(path.join(CAL, 'casos', 'catalogo.md'), md);
}

function escribirInforme(casos, metricas, defs) {
  const { res, indice } = puntajes(metricas);
  const cuenta = (e) => casos.filter(c => c.estado === e).length;
  const ejecutados = casos.filter(c => c.estado !== 'omitido').length;
  const porTipo = {};
  for (const c of casos) {
    const t = clasificar(c.id).tipo;
    porTipo[t] = porTipo[t] || { total: 0, aprobado: 0, defecto: 0, fallido: 0 };
    porTipo[t].total++;
    porTipo[t][c.estado] = (porTipo[t][c.estado] || 0) + 1;
  }
  const abiertos = defs.filter(d => d.estado === 'Abierto');
  const porSev = (lista) => ['Crítica', 'Alta', 'Media', 'Baja'].map(s => `${s}: ${lista.filter(d => d.severidad === s).length}`).join(' · ');
  const conclusiones = path.join(CAL, 'informes', `${VERSION}-conclusiones.md`);

  const md = `# Informe de ejecución de pruebas — ${VERSION}

| | |
|---|---|
| Fecha de ejecución | ${HOY} |
| Versión evaluada | ${VERSION} |
| Plan de pruebas | PP-AD-01 (\`03_plan_de_pruebas.md\`) |
| Entorno | Windows 11 · Node.js ${process.version} · PostgreSQL 17 (base \`dt_deportivo_pruebas\`) · Chromium, Firefox y WebKit (Playwright) |
| Generado por | \`npm run test:reporte -- ${VERSION}\` |

## 1. Resumen

| Indicador | Valor |
|---|---|
| Casos automatizados diseñados | ${casos.length} |
| Casos ejecutados | ${ejecutados} |
| Aprobados | ${cuenta('aprobado')} |
| Fallas conocidas (defectos abiertos registrados) | ${cuenta('defecto')} |
| Fallidos sin defecto registrado | ${cuenta('fallido')} |
| **Porcentaje de aprobación** | **${pct(cuenta('aprobado'), ejecutados)} %** |
| **Índice de calidad global** | **${indice ?? 'sin datos'} / 100** (meta ≥ 85) |

## 2. Resultados por tipo de prueba

| Tipo | Casos | Aprobados | Fallas conocidas | Fallidos |
|---|---|---|---|---|
${Object.entries(porTipo).map(([t, v]) => `| ${t} | ${v.total} | ${v.aprobado || 0} | ${v.defecto || 0} | ${v.fallido || 0} |`).join('\n')}

## 3. Métricas de calidad (ISO/IEC 9126)

🟢 cumple · 🟡 aceptable · 🔴 no cumple · ⚪ pendiente de medir

| ID | Característica | Métrica | Resultado | Meta | Estado |
|---|---|---|---|---|---|
${metricas.map(m => `| ${m.id} | ${m.car} | ${m.nombre} | ${m.texto} | ${m.meta} | ${m.sem} |`).join('\n')}

### Puntaje por característica

| Característica | Peso | Métricas medidas | Puntaje |
|---|---|---|---|
${Object.entries(res).map(([c, v]) => `| ${c} | ${PESOS[c] * 100} % | ${v.medidas} de ${v.total} | ${v.puntaje ?? '—'} |`).join('\n')}
| **Índice global** | | | **${indice ?? '—'}** |

El índice se calcula solo con las métricas medidas, reponderando los pesos de las características con datos.

## 4. Defectos

- Registrados en total: ${defs.length} · Cerrados: ${defs.filter(d => d.estado === 'Cerrado').length} · **Abiertos: ${abiertos.length}** (${porSev(abiertos)})

| ID | Severidad | Módulo | Descripción | Se corregirá en |
|---|---|---|---|---|
${abiertos.map(d => `| ${d.id} | ${d.severidad} | ${d.modulo} | ${d.descripcion} | ${d.en} |`).join('\n')}

Detalle completo e historial: \`defectos.md\`.

## 5. Evidencias

- Salida de cada caso: \`casos/catalogo.md\` (último resultado) y la salida de consola de \`npm test\`.
- Mediciones en bruto de esta ejecución: \`informes/evidencias/${VERSION}/\` (accesibilidad, objetivos táctiles, carga, caída del servidor y recorrido por rol).
- En cada equipo, \`npm run test:ui\` genera además un reporte HTML navegable con capturas y trazas de las fallas en \`pruebas/resultados/ui-html/\`.
${fs.existsSync(conclusiones) ? '\n' + fs.readFileSync(conclusiones, 'utf8') : ''}`;
  fs.mkdirSync(path.join(CAL, 'informes'), { recursive: true });
  fs.writeFileSync(path.join(CAL, 'informes', `${VERSION}.md`), md);

  // Copia de las mediciones como evidencia versionada
  const ev = path.join(CAL, 'informes', 'evidencias', VERSION);
  fs.mkdirSync(ev, { recursive: true });
  if (fs.existsSync(MET)) for (const f of fs.readdirSync(MET)) fs.copyFileSync(path.join(MET, f), path.join(ev, f));
  const p95 = p95ApiLectura();
  if (p95) fs.writeFileSync(path.join(ev, 'tiempos-api.json'), JSON.stringify(p95, null, 2));
}

const casos = [...casosApi(), ...casosUi()];
const defs = defectos();
const metricas = calcular(casos, defs);
escribirCatalogo(casos);
escribirInforme(casos, metricas, defs);
const { indice } = puntajes(metricas);
console.log(`Informe ${VERSION}: ${casos.length} casos, índice global ${indice}.`);
console.log(`  docs/calidad/informes/${VERSION}.md\n  docs/calidad/casos/catalogo.md`);
