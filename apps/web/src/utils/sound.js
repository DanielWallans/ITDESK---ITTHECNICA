// ============================================================================
// Síntese de Áudio Cristalina (Estilo "Plim / Tri-tone" iOS) via Web Audio API
// Sem dependência de arquivos MP3 externos
// ============================================================================

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Desbloqueia o AudioContext no primeiro clique ou tecla do administrador
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

/**
 * Toca o alerta cristalino estilo iPhone ("Plim" de 3 notas ascendentes)
 */
export function playNotificationChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Notas do acorde cristalino (Si5 -> Mi6 -> Sol#6, estilo Tri-tone / Plim)
    const notes = [
      { freq: 987.77, start: 0.0, duration: 0.22, gain: 0.24 },
      { freq: 1318.51, start: 0.11, duration: 0.24, gain: 0.26 },
      { freq: 1661.22, start: 0.22, duration: 0.55, gain: 0.30 }
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const t0 = now + start;
      const t1 = t0 + duration;

      // Oscilador principal (Senoide pura)
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);

      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(gain, t0 + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);

      // Harmônico de brilho (1 oitava acima, bem suave para dar timbre de sino/cristal)
      const oscHarm = ctx.createOscillator();
      const envHarm = ctx.createGain();
      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(freq * 2, t0);

      envHarm.gain.setValueAtTime(0.0001, t0);
      envHarm.gain.linearRampToValueAtTime(gain * 0.18, t0 + 0.008);
      envHarm.gain.exponentialRampToValueAtTime(0.0001, t0 + duration * 0.65);

      oscHarm.connect(envHarm);
      envHarm.connect(ctx.destination);
      oscHarm.start(t0);
      oscHarm.stop(t1);
    });
  } catch {
    // Ignora caso o navegador bloqueie antes da primeira interação
  }
}

