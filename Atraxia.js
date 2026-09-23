/* ============================================================
   Atraxia.js - motor de respuestas de Atraxia
   Colabora: agrega frases en cerebro.json o cerebro.txt
   ============================================================ */
(function (global) {
  const CONFIG = {
    nombre: 'Atraxia',
    github: 'https://github.com/TU-USUARIO/Atraxia', // <- cambia por el link real
    cadaMensajes: 10
  };

  let cerebro = { fallback: [], intents: [] };
  const ultimo = {};

  const base = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // texto para comparar frases (sin signos); "math" conserva los símbolos de cálculo
  const norm = (t, math) => {
    let r = base(t);
    r = math ? r.replace(/[^a-z0-9+\-*/().,^\s]/g, ' ') : r.replace(/[^a-z0-9\s]/g, ' ');
    return r.replace(/\s+/g, ' ').trim();
  };

  const elegir = (id, lista) => {
    if (!lista || !lista.length) return '';
    let r = lista[Math.floor(Math.random() * lista.length)];
    if (lista.length > 1 && r === ultimo[id]) r = lista[(lista.indexOf(r) + 1) % lista.length];
    ultimo[id] = r;
    return r;
  };

  const plantilla = (t) => t
    .replace(/\{\{nombre\}\}/g, CONFIG.nombre)
    .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    .replace(/\\n/g, '\n');

  // Une un cerebro nuevo (objeto JSON) o texto (formato cerebro.txt) con el actual
  function cargar(fuente) {
    const nuevo = typeof fuente === 'string' ? parseTexto(fuente) : fuente;
    if (!nuevo) return;
    const unir = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
    cerebro.fallback = unir(cerebro.fallback, nuevo.fallback);
    (nuevo.intents || []).forEach((n) => {
      const ex = cerebro.intents.find((i) => i.id === n.id);
      if (ex) {
        ex.patrones = unir(ex.patrones, n.patrones);
        ex.respuestas = unir(ex.respuestas, n.respuestas);
      } else {
        cerebro.intents.push({ id: n.id, patrones: n.patrones || [], respuestas: n.respuestas || [] });
      }
    });
  }

  // Formato texto:  "# id"  /  "P: patron"  /  "R: respuesta"  /  "F: respuesta por defecto"
  function parseTexto(txt) {
    const out = { fallback: [], intents: [] };
    let actual = null;
    String(txt).split(/\r?\n/).forEach((linea) => {
      const l = linea.trim();
      if (!l || l.startsWith('//')) return;
      if (l.startsWith('#')) {
        actual = { id: l.slice(1).trim(), patrones: [], respuestas: [] };
        out.intents.push(actual);
      } else if (/^P:/i.test(l) && actual) actual.patrones.push(l.slice(2).trim());
      else if (/^R:/i.test(l) && actual) actual.respuestas.push(l.slice(2).trim());
      else if (/^F:/i.test(l)) out.fallback.push(l.slice(2).trim());
    });
    return out;
  }

  function calcular(t) {
    const m = t.match(/(?:cuanto es|calcula|resuelve|cuanto da)\s+([\d\s+\-*/().,x^]+)$/);
    if (!m) return null;
    const expr = m[1].replace(/x/g, '*').replace(/,/g, '.').replace(/\^/g, '**');
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
    try {
      const r = Function('"use strict";return (' + expr + ')')();
      return Number.isFinite(r) ? 'El resultado es **' + Number(r.toFixed(6)) + '**.' : null;
    } catch (e) { return null; }
  }

  function responder(texto) {
    const t = norm(texto);
    if (!t) return elegir('fb', cerebro.fallback);
    const calc = calcular(norm(texto, true));
    if (calc) return calc;

    const padded = ' ' + t + ' ';
    const hallados = [];
    cerebro.intents.forEach((it) => {
      let mejor = null;
      it.patrones.forEach((p) => {
        const pn = norm(p);
        if (!pn) return;
        const idx = padded.indexOf(' ' + pn + ' ');
        if (idx < 0) return;
        const score = pn.split(' ').length * 10 + pn.length;
        if (!mejor || score > mejor.score) mejor = { it, score, idx, tokens: pn.split(' ') };
      });
      if (mejor) hallados.push(mejor);
    });

    hallados.sort((a, b) => b.score - a.score);
    const elegidos = [];
    const usados = new Set();
    hallados.forEach((h) => {
      if (elegidos.length >= 2) return;
      if (h.tokens.some((tk) => usados.has(tk))) return;
      h.tokens.forEach((tk) => usados.add(tk));
      elegidos.push(h);
    });

    if (!elegidos.length) return plantilla(elegir('fb', cerebro.fallback));
    elegidos.sort((a, b) => a.idx - b.idx);
    return elegidos.map((h) => plantilla(elegir(h.it.id, h.it.respuestas))).join(' ');
  }

  const debeAyudar = (n) => n > 0 && n % CONFIG.cadaMensajes === 0;

  const mensajeAyuda = () =>
    '🚀 **Ayúdanos a terminar este chat**\n\n' +
    'Para continuar, **Atraxia necesita ayuda general**. Necesitamos tu ayuda: entra a nuestro ' +
    '[GitHub](' + CONFIG.github + '), usa la carpeta **Atraxia** y el archivo `Atraxia.js` para actualizarlo, ' +
    'y suma frases al texto del cerebro (`cerebro.txt` / `cerebro.json`).\n\n' +
    'Tu colaboración será muy bienvenida. ¡Muchas gracias por leer! Así Atraxia podrá responder a más ' +
    'solicitudes y decir distintas frases básicas como "hola" o "¿cómo estás?".';

  global.Atraxia = { config: CONFIG, cargar, parseTexto, responder, debeAyudar, mensajeAyuda };
})(typeof window !== 'undefined' ? window : globalThis);
