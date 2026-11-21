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
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const rev = reverb(), mojado = ac.createGain(); mojado.gain.value = 0.55;
    rev.connect(mojado); mojado.connect(master);
    const seco = ac.createGain(); seco.gain.value = 0.6; seco.connect(master);
    ac._bus = (nodo) => { nodo.connect(seco); nodo.connect(rev); };

    // Colchón: acorde abierto en Re con un filtro que respira despacio.
    const filtro = ac.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 700; filtro.Q.value = 0.4;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 350;
    lfo.connect(lfoG); lfoG.connect(filtro.frequency); lfo.start();
    const pad = ac.createGain(); pad.gain.value = 0.11; filtro.connect(pad); ac._bus(pad);
    for (const [f, tipo] of [[73.42, "sine"], [110, "triangle"], [146.83, "sine"], [220.5, "triangle"], [293.66, "sine"], [329.63, "sine"]]) {
      for (const det of [-4, 4]) { const o = ac.createOscillator(); o.type = tipo; o.frequency.value = f; o.detune.value = det; const g = ac.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(filtro); o.start(); }
    }
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
      if (!ac) { montar(); programar(campanita, 2500, 6000); programar(cuenco, 15000, 30000); setInterval(volumen, 400); }
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
  document.addEventListener("visibilitychange", () => { if (!ac) return; document.hidden ? ac.suspend() : encendida && ac.resume(); });
  return { iniciar, alternar, microfono };
})();
