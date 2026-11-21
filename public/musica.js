// Música ambiental generada en el navegador (Web Audio): colchón suave, campanitas en escala
// pentatónica y un cuenco tibetano de vez en cuando. Sin archivos ni derechos de autor.
// Baja sola cuando Arcana habla y se calla mientras el micrófono escucha.
window.Musica = (() => {
  let ac = null, master = null, encendida = false, timers = [], micActivo = false;
  const VOL = 0.22;
  let preferencia = true;
  try { preferencia = localStorage.getItem("arcana-musica") !== "no"; } catch {}

  function reverb() {
    const len = ac.sampleRate * 4.5, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const cv = ac.createConvolver(); cv.buffer = buf; return cv;
  }

  function montar() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const rev = reverb(), mojado = ac.createGain(); mojado.gain.value = 0.55;
    rev.connect(mojado); mojado.connect(master);
    const seco = ac.createGain(); seco.gain.value = 0.6; seco.connect(master);
    ac._bus = (nodo) => { nodo.connect(seco); nodo.connect(rev); };

    // Colchón: progresión mística Rem - Sib - Fa - Do que cambia cada 8 segundos.
    const filtro = ac.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 900; filtro.Q.value = 0.5;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(filtro.frequency); lfo.start();
    const pad = ac.createGain(); pad.gain.value = 0.1; filtro.connect(pad); ac._bus(pad);
    ac._voces = [];
    for (let i = 0; i < 4; i++) for (const det of [-5, 5]) {
      const o = ac.createOscillator(); o.type = i === 0 ? "sine" : "triangle"; o.detune.value = det;
      const g = ac.createGain(); g.gain.value = i === 0 ? 0.3 : 0.16; o.connect(g); g.connect(filtro); o.start();
      ac._voces.push({ o, i });
    }
    ac._acorde = 0; acorde();
  }

  // Rem, Sib, Fa, Do: graves + tres notas del acorde; el arpegio usa las mismas notas.
  const ACORDES = [
    [73.42, 146.83, 174.61, 220.0], [58.27, 116.54, 146.83, 174.61],
    [87.31, 174.61, 220.0, 261.63], [65.41, 130.81, 164.81, 196.0],
  ];
  function acorde() {
    const notas = ACORDES[ac._acorde % 4], t = ac.currentTime;
    for (const v of ac._voces) v.o.frequency.setTargetAtTime(notas[v.i], t, 0.8);
  }

  // Arpegio suave tipo arpa, a 66 pulsos por minuto.
  let paso = 0;
  function arpegio() {
    const notas = ACORDES[ac._acorde % 4], patron = [1, 2, 3, 2, 3, 1, 2, 3];
    const f = notas[patron[paso % 8]] * (paso % 16 < 8 ? 2 : 4), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = 2400;
    o.connect(fl); fl.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    ac._bus(g); o.start(t); o.stop(t + 1.7);
    // Latido muy suave en el primer pulso de cada compás, como un tambor chamánico lejano.
    if (paso % 4 === 0) {
      const d = ac.createOscillator(), dg = ac.createGain(); d.type = "sine";
      d.frequency.setValueAtTime(95, t); d.frequency.exponentialRampToValueAtTime(48, t + 0.35);
      dg.gain.setValueAtTime(0, t); dg.gain.linearRampToValueAtTime(0.16, t + 0.01); dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      d.connect(dg); ac._bus(dg); d.start(t); d.stop(t + 0.7);
    }
    paso++;
    if (paso % 16 === 0) { ac._acorde++; acorde(); }
  }

  function campanita() {
    const notas = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98];
    const t = ac.currentTime, f = notas[(Math.random() * notas.length) | 0];
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.01;
    const g2 = ac.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g); o.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    ac._bus(g); o.start(t); o2.start(t); o.stop(t + 4.2); o2.stop(t + 4.2);
  }

  function cuenco() {
    const t = ac.currentTime, base = 196 + Math.random() * 30;
    for (const [k, a] of [[1, 0.09], [2.76, 0.035], [5.4, 0.012]]) {
      const o = ac.createOscillator(), b = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = base * k; b.frequency.value = base * k + 1.5; // leve batido, como un cuenco real
      o.connect(g); b.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 12);
      ac._bus(g); o.start(t); b.start(t); o.stop(t + 12.5); b.stop(t + 12.5);
    }
  }

  function programar(fn, min, max) {
    const id = setTimeout(() => { if (encendida && !document.hidden) fn(); programar(fn, min, max); }, min + Math.random() * (max - min));
    timers.push(id);
  }

  function volumen() {
    if (!ac) return;
    const habla = window.speechSynthesis && window.speechSynthesis.speaking;
    const v = !encendida || micActivo ? 0 : habla ? VOL * 0.3 : VOL;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(v, ac.currentTime, 0.6);
  }

  function iniciar() {
    if (!preferencia) return;
    encender();
  }
  function encender() {
    try {
      if (!master) {
        montar(); programar(campanita, 4000, 9000); programar(cuenco, 25000, 45000); setInterval(volumen, 400);
        setInterval(() => { if (encendida && !document.hidden) arpegio(); }, 60000 / 66 / 2);
      }
      if (ac.state === "suspended") ac.resume();
      encendida = true; volumen(); actualizarBoton();
    } catch (e) { console.warn("Música no disponible", e); }
  }
  function apagar() { encendida = false; volumen(); actualizarBoton(); }
  function alternar() {
    preferencia = !encendida;
    try { localStorage.setItem("arcana-musica", preferencia ? "si" : "no"); } catch {}
    preferencia ? encender() : apagar();
  }
  function microfono(activo) { micActivo = activo; volumen(); }
  function actualizarBoton() {
    const b = document.getElementById("musica"); if (!b) return;
    b.setAttribute("aria-pressed", String(encendida));
  }
  // Efectos de la mesa: roce de cartón mate al cortar el mazo y un destello cristalino al revelar una carta.
  function efecto(tipo) {
    if (!preferencia) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
      if (tipo === "roce" || tipo === "corte") {
        const dur = tipo === "corte" ? 0.32 : 0.12, buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ac.createBufferSource(); src.buffer = buf;
        const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = tipo === "corte" ? 1800 : 2600 + Math.random() * 900; bp.Q.value = 0.9;
        g.gain.setValueAtTime(tipo === "corte" ? 0.22 : 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(bp); bp.connect(g); src.start(t);
      } else {
        [1568, 2093, 2637].forEach((f, i) => {
          const o = ac.createOscillator(), gi = ac.createGain(); o.type = "sine"; o.frequency.value = f;
          gi.gain.setValueAtTime(0, t + i * 0.06); gi.gain.linearRampToValueAtTime(0.07, t + i * 0.06 + 0.01); gi.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.06 + 1.4);
          o.connect(gi); gi.connect(g); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 1.5);
        });
        g.gain.value = 1;
      }
    } catch {}
  }
  document.addEventListener("visibilitychange", () => { if (!ac) return; document.hidden ? ac.suspend() : encendida && ac.resume(); });
  return { iniciar, alternar, microfono, efecto };
})();
