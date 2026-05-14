/* ═══════════════════════════════════════════════════════════
   TECLADO VIRTUAL · MINI SYNTH
   teclado-virtual.js
═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   1. CONSTANTES E CONFIGURAÇÃO
══════════════════════════════════════════════════════════ */

/** Frequências das notas em Hz */
const FREQ = {
  'C4':  261.63,
  'C#4': 277.18,
  'D4':  293.66,
  'D#4': 311.13,
  'E4':  329.63,
  'F4':  349.23,
  'F#4': 369.99,
  'G4':  392.00,
  'G#4': 415.30,
  'A4':  440.00,
  'A#4': 466.16,
  'B4':  493.88,
};

/** Nomes em português das notas */
const NOTE_PT = {
  'C4':'Dó',   'C#4':'Dó#',  'D4':'Ré',   'D#4':'Ré#',
  'E4':'Mi',   'F4':'Fá',    'F#4':'Fá#', 'G4':'Sol',
  'G#4':'Sol#','A4':'Lá',    'A#4':'Lá#', 'B4':'Si',
};

/** Ordem das notas no piano roll (de cima para baixo) */
const NOTE_ROWS = ['B4','A#4','A4','G#4','G4','F#4','F4','E4','D#4','D4','C#4','C4'];

/** Altura de cada linha do piano roll (px) */
const ROW_H = 26;

/** Pixels por segundo no piano roll */
const PX_PER_SEC = 90;

/** Chave do localStorage para melodias salvas */
const STORAGE_KEY = 'minisynth_melodies';

/** Cores neon por nota */
const NOTE_COLORS = {
  'C4':  { main: '#bf00ff', bg: 'rgba(191,0,255,.3)'  },
  'C#4': { main: '#d400cc', bg: 'rgba(212,0,204,.3)'  },
  'D4':  { main: '#7b00ff', bg: 'rgba(123,0,255,.3)'  },
  'D#4': { main: '#0055ff', bg: 'rgba(0,85,255,.3)'   },
  'E4':  { main: '#0099ff', bg: 'rgba(0,153,255,.3)'  },
  'F4':  { main: '#00ddff', bg: 'rgba(0,221,255,.3)'  },
  'F#4': { main: '#00ffcc', bg: 'rgba(0,255,204,.3)'  },
  'G4':  { main: '#39ff14', bg: 'rgba(57,255,20,.3)'  },
  'G#4': { main: '#aaff00', bg: 'rgba(170,255,0,.3)'  },
  'A4':  { main: '#ffee00', bg: 'rgba(255,238,0,.3)'  },
  'A#4': { main: '#ff8800', bg: 'rgba(255,136,0,.3)'  },
  'B4':  { main: '#ff0066', bg: 'rgba(255,0,102,.3)'  },
};


/* ══════════════════════════════════════════════════════════
   2. ESTADO GLOBAL
══════════════════════════════════════════════════════════ */

/** Web Audio context (criado no primeiro toque) */
let audioCtx = null;

/** Forma de onda selecionada */
let currentWave = 'sine';

/** Nós de áudio ativos: note → { osc, gain } */
let activeNodes = {};

/** Teclas físicas pressionadas no momento */
let pressedKeys = new Set();

/** Intervalo do visualizador */
let vizInterval = null;

/* ── Estado do gravador ── */
let isRecording   = false;
let isPlaying     = false;
let recordingStart = null;
let recordedNotes = [];          // { note, startTime, duration }
let activeRecordNotes = {};      // note → timestamp de início
let timerInterval = null;
let playbackTimeouts = [];
let playheadAnimId   = null;

/** Melodia atualmente carregada/gravada no editor */
let currentMelody = [];


/* ══════════════════════════════════════════════════════════
   3. WEB AUDIO — MOTOR DE SOM
══════════════════════════════════════════════════════════ */

/**
 * Retorna (ou cria) o AudioContext, garantindo que esteja ativo.
 */
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/**
 * Inicia a reprodução de uma nota com envelope ADSR simples.
 * @param {string} note  Ex.: 'C4', 'F#4'
 */
function playNote(note) {
  const freq = FREQ[note];
  if (!freq || activeNodes[note]) return;

  const ac   = getAudioContext();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  const comp = ac.createDynamicsCompressor();

  osc.type = currentWave;
  osc.frequency.setValueAtTime(freq, ac.currentTime);

  /* Attack rápido (10 ms) */
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.28, ac.currentTime + 0.01);

  osc.connect(gain);
  gain.connect(comp);
  comp.connect(ac.destination);
  osc.start();

  activeNodes[note] = { osc, gain };

  updateNoteDisplay(note, freq);
  animateVisualizer(freq);
}

/**
 * Para a reprodução de uma nota com release suave (300 ms).
 * @param {string} note
 */
function stopNote(note) {
  const n = activeNodes[note];
  if (!n) return;

  const ac = getAudioContext();
  n.gain.gain.setValueAtTime(n.gain.gain.value, ac.currentTime);
  n.gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
  n.osc.stop(ac.currentTime + 0.31);

  delete activeNodes[note];

  /* Limpa o display se não houver nenhuma nota ativa */
  setTimeout(() => {
    if (Object.keys(activeNodes).length === 0) clearNoteDisplay();
  }, 350);
}


/* ══════════════════════════════════════════════════════════
   4. DISPLAY DE NOTA E VISUALIZADOR
══════════════════════════════════════════════════════════ */

function updateNoteDisplay(note, freq) {
  document.getElementById('nd-note').textContent = NOTE_PT[note] || note;
  document.getElementById('nd-freq').textContent = freq.toFixed(2) + ' Hz';
}

function clearNoteDisplay() {
  document.getElementById('nd-note').textContent = '–';
  document.getElementById('nd-freq').textContent = '— Hz';
}

function animateVisualizer() {
  clearInterval(vizInterval);
  const bars = Array.from({ length: 8 }, (_, i) => document.getElementById('b' + (i + 1)));
  let t = 0;

  vizInterval = setInterval(() => {
    if (Object.keys(activeNodes).length === 0) {
      bars.forEach(b => { if (b) b.style.height = '4px'; });
      clearInterval(vizInterval);
      return;
    }
    bars.forEach((b, i) => {
      if (!b) return;
      const h = 12 + Math.abs(Math.sin(t * 4 + i * 0.7)) * 50;
      b.style.height = h + 'px';
    });
    t += 0.06;
  }, 40);
}


/* ══════════════════════════════════════════════════════════
   5. EVENTOS DO PIANO — MOUSE, TOUCH E TECLADO FÍSICO
══════════════════════════════════════════════════════════ */

function bindPianoKeys() {
  document.querySelectorAll('[data-note]').forEach(el => {
    const note = el.dataset.note;

    /* ── Mouse ── */
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      triggerNoteOn(note, el);
    });
    el.addEventListener('mouseup',    () => triggerNoteOff(note, el));
    el.addEventListener('mouseleave', () => triggerNoteOff(note, el));

    /* ── Touch ── */
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      triggerNoteOn(note, el);
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      triggerNoteOff(note, el);
    });
  });
}

/** Mapa: tecla do teclado físico → elemento da tecla do piano */
function buildKeyMap() {
  const map = {};
  document.querySelectorAll('[data-key]').forEach(el => {
    map[el.dataset.key] = el;
  });
  return map;
}

function bindPhysicalKeyboard(keyMap) {
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const el  = keyMap[key];
    if (!el || pressedKeys.has(key)) return;
    pressedKeys.add(key);
    triggerNoteOn(el.dataset.note, el);
  });

  document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    const el  = keyMap[key];
    pressedKeys.delete(key);
    if (!el) return;
    triggerNoteOff(el.dataset.note, el);
  });
}

/** Liga uma nota: toca, destaca e registra na gravação se ativa */
function triggerNoteOn(note, el) {
  playNote(note);
  el.classList.add('active');
  addRipple(el);
  recordNoteStart(note);
}

/** Desliga uma nota */
function triggerNoteOff(note, el) {
  stopNote(note);
  el.classList.remove('active');
  recordNoteEnd(note);
}

/** Efeito ripple na tecla pressionada */
function addRipple(el) {
  const r = document.createElement('span');
  r.className = 'ripple-effect';
  el.appendChild(r);
  setTimeout(() => r.remove(), 550);
}

/** Destaca ou remove destaque de uma tecla pelo nome da nota */
function highlightKey(note, on) {
  const el = document.querySelector(`[data-note="${note}"]`);
  if (el) el.classList.toggle('active', on);
}


/* ══════════════════════════════════════════════════════════
   6. SELETOR DE WAVEFORM
══════════════════════════════════════════════════════════ */

function bindWaveSelector() {
  document.getElementById('wave-row').addEventListener('click', e => {
    const btn = e.target.closest('.wave-btn');
    if (!btn) return;
    document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    currentWave = btn.dataset.wave;
  });
}


/* ══════════════════════════════════════════════════════════
   7. GRAVADOR — CAPTURA DE MELODIA
══════════════════════════════════════════════════════════ */

/** Inicia a gravação */
function startRecording() {
  if (isPlaying) stopPlayback();

  recordedNotes      = [];
  activeRecordNotes  = {};
  recordingStart     = performance.now();
  isRecording        = true;

  timerInterval = setInterval(updateRecordingTimer, 100);
  updateRecorderUI();
  renderPianoRoll([]);
}

/** Para a gravação e finaliza as notas ainda pressionadas */
function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(timerInterval);

  const now = performance.now();
  for (const [note, startTs] of Object.entries(activeRecordNotes)) {
    const duration  = Math.max(0.1, (now - startTs) / 1000);
    const startTime = (startTs - recordingStart) / 1000;
    recordedNotes.push({ note, startTime, duration });
  }
  activeRecordNotes = {};
  recordedNotes.sort((a, b) => a.startTime - b.startTime);
  currentMelody = [...recordedNotes];

  updateRecorderUI();
  renderPianoRoll(currentMelody);
  updateNotesCount();
}

/** Registra o início de uma nota durante a gravação */
function recordNoteStart(note) {
  if (!isRecording) return;
  activeRecordNotes[note] = performance.now();
}

/** Registra o fim de uma nota durante a gravação */
function recordNoteEnd(note) {
  if (!isRecording || !activeRecordNotes[note]) return;
  const startTs   = activeRecordNotes[note];
  const duration  = Math.max(0.08, (performance.now() - startTs) / 1000);
  const startTime = (startTs - recordingStart) / 1000;
  recordedNotes.push({ note, startTime, duration });
  delete activeRecordNotes[note];
  updateNotesCount();
  renderPianoRoll([...recordedNotes]); // atualização ao vivo
}

/** Limpa toda a melodia do editor */
function clearMelody() {
  if (isRecording) stopRecording();
  if (isPlaying)   stopPlayback();

  recordedNotes = [];
  currentMelody = [];

  updateRecorderUI();
  renderPianoRoll([]);
  updateNotesCount();

  document.getElementById('rec-time').textContent = '00:00.0';
}

/** Atualiza o cronômetro enquanto grava */
function updateRecordingTimer() {
  if (!isRecording) return;
  const elapsed = (performance.now() - recordingStart) / 1000;
  document.getElementById('rec-time').textContent = formatTime(elapsed);
}

/** Atualiza o contador de notas gravadas */
function updateNotesCount() {
  document.getElementById('notes-count').textContent = recordedNotes.length;
}

/**
 * Formata segundos como MM:SS.d
 * @param {number} seconds
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const ss = s.toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${ss}`;
}


/* ══════════════════════════════════════════════════════════
   8. REPRODUÇÃO DE MELODIA
══════════════════════════════════════════════════════════ */

/**
 * Reproduz um array de notas gravadas com a temporização original.
 * @param {Array} notes  Array de { note, startTime, duration }
 */
function playMelody(notes) {
  if (!notes || notes.length === 0) return;
  if (isPlaying) stopPlayback();

  isPlaying = true;
  playbackTimeouts = [];
  updateRecorderUI();

  const totalDuration = notes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration), 0
  );

  notes.forEach(({ note, startTime, duration }) => {
    const t1 = setTimeout(() => {
      playNote(note);
      highlightKey(note, true);
      const t2 = setTimeout(() => {
        stopNote(note);
        highlightKey(note, false);
      }, duration * 1000);
      playbackTimeouts.push(t2);
    }, startTime * 1000);
    playbackTimeouts.push(t1);
  });

  /* Animação do playhead */
  animatePlayhead(totalDuration);

  /* Finalização */
  const endT = setTimeout(() => {
    isPlaying = false;
    updateRecorderUI();
    resetPlayhead();
  }, (totalDuration + 0.3) * 1000);
  playbackTimeouts.push(endT);
}

/** Para a reprodução imediatamente */
function stopPlayback() {
  playbackTimeouts.forEach(t => clearTimeout(t));
  playbackTimeouts = [];

  Object.keys(activeNodes).forEach(note => {
    stopNote(note);
    highlightKey(note, false);
  });

  isPlaying = false;
  updateRecorderUI();
  resetPlayhead();
}

/** Atualiza o estado visual dos botões do gravador */
function updateRecorderUI() {
  const btnRec      = document.getElementById('btn-rec');
  const btnStop     = document.getElementById('btn-stop');
  const btnPlay     = document.getElementById('btn-play');
  const btnStopPlay = document.getElementById('btn-stop-play');

  btnRec.classList.toggle('active', isRecording);
  btnStop.disabled     = !isRecording;
  btnPlay.disabled     = currentMelody.length === 0 || isRecording || isPlaying;
  btnStopPlay.disabled = !isPlaying;
}


/* ══════════════════════════════════════════════════════════
   9. PIANO ROLL — VISUALIZAÇÃO E EDIÇÃO
══════════════════════════════════════════════════════════ */

/** Inicializa os labels das notas no painel esquerdo do roll */
function initPianoRollLabels() {
  const container = document.getElementById('roll-labels');
  container.innerHTML = '';

  NOTE_ROWS.forEach(note => {
    const div = document.createElement('div');
    div.className = 'roll-label' + (note.includes('#') ? ' roll-label--black' : '');
    div.textContent = NOTE_PT[note] || note;
    div.style.color = NOTE_COLORS[note]?.main || 'rgba(255,255,255,.4)';
    container.appendChild(div);
  });
}

/**
 * Renderiza o piano roll completo com notas, grid e playhead.
 * @param {Array} notes
 */
function renderPianoRoll(notes) {
  const area    = document.getElementById('roll-area');
  const emptyEl = document.getElementById('roll-empty');
  area.innerHTML = '';

  if (!notes || notes.length === 0) {
    emptyEl.style.display = 'flex';
    area.style.width  = '100%';
    area.style.height = (NOTE_ROWS.length * ROW_H) + 'px';
    return;
  }

  emptyEl.style.display = 'none';

  const totalTime = notes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration), 0
  );
  const rollWidth  = Math.max(totalTime * PX_PER_SEC + 120, 500);
  const rollHeight = NOTE_ROWS.length * ROW_H;

  area.style.width  = rollWidth  + 'px';
  area.style.height = rollHeight + 'px';

  /* ── Grid horizontal (faixas de nota) ── */
  NOTE_ROWS.forEach((note, i) => {
    const line = document.createElement('div');
    line.className = 'roll-hline' + (note.includes('#') ? ' roll-hline--black' : '');
    line.style.top    = (i * ROW_H) + 'px';
    line.style.width  = rollWidth + 'px';
    area.appendChild(line);
  });

  /* ── Grid vertical (marcadores de tempo a cada 0.5s) ── */
  const steps = Math.ceil(totalTime / 0.5) + 3;
  for (let i = 0; i <= steps; i++) {
    const x = i * 0.5 * PX_PER_SEC;

    const vline = document.createElement('div');
    vline.className = 'roll-vline' + (i % 2 === 0 ? ' roll-vline--beat' : '');
    vline.style.left   = x + 'px';
    vline.style.height = rollHeight + 'px';
    area.appendChild(vline);

    /* Label de tempo (a cada segundo) */
    if (i % 2 === 0) {
      const label = document.createElement('div');
      label.className   = 'roll-time-label';
      label.style.left  = (x + 3) + 'px';
      label.textContent = (i * 0.5).toFixed(1) + 's';
      area.appendChild(label);
    }
  }

  /* ── Blocos de nota ── */
  notes.forEach((n, idx) => {
    const rowIdx = NOTE_ROWS.indexOf(n.note);
    if (rowIdx === -1) return;

    const col    = NOTE_COLORS[n.note] || { main: '#fff', bg: 'rgba(255,255,255,.2)' };
    const blockW = Math.max(n.duration * PX_PER_SEC - 2, 6);

    const block = document.createElement('div');
    block.className = 'roll-note';
    block.style.top        = (rowIdx * ROW_H + 2) + 'px';
    block.style.left       = (n.startTime * PX_PER_SEC) + 'px';
    block.style.width      = blockW + 'px';
    block.style.height     = (ROW_H - 4) + 'px';
    block.style.background = `linear-gradient(90deg, ${col.main}, ${col.bg})`;
    block.style.borderLeft = `2px solid ${col.main}`;
    block.style.boxShadow  = `0 0 8px ${col.main}80, inset 0 1px 0 rgba(255,255,255,.12)`;
    block.title            = `${NOTE_PT[n.note] || n.note} · ${n.duration.toFixed(2)}s — clique para deletar`;
    block.dataset.idx      = idx;

    /* Label do nome da nota (se o bloco for largo o suficiente) */
    if (blockW > 28) {
      const lbl = document.createElement('span');
      lbl.className   = 'roll-note__label';
      lbl.textContent = NOTE_PT[n.note] || n.note;
      lbl.style.color = col.main;
      block.appendChild(lbl);
    }

    /* Clique para deletar a nota */
    block.addEventListener('click', () => deleteNoteFromRoll(idx));

    area.appendChild(block);
  });

  /* ── Playhead ── */
  const playhead = document.createElement('div');
  playhead.id        = 'roll-playhead';
  playhead.className = 'roll-playhead';
  area.appendChild(playhead);
}

/**
 * Remove uma nota do editor pelo seu índice e atualiza tudo.
 * @param {number} idx
 */
function deleteNoteFromRoll(idx) {
  currentMelody.splice(idx, 1);
  recordedNotes = [...currentMelody];
  renderPianoRoll(currentMelody);
  updateNotesCount();
  updateRecorderUI();

  /* Atualiza o tempo exibido */
  if (currentMelody.length > 0) {
    const dur = currentMelody.reduce(
      (max, n) => Math.max(max, n.startTime + n.duration), 0
    );
    document.getElementById('rec-time').textContent = formatTime(dur);
  } else {
    document.getElementById('rec-time').textContent = '00:00.0';
  }
}

/* ── Playhead animado ── */
function animatePlayhead(totalDuration) {
  const startMs = performance.now();

  function frame() {
    const ph = document.getElementById('roll-playhead');
    if (!ph) return;

    const elapsed = (performance.now() - startMs) / 1000;
    ph.style.left    = (elapsed * PX_PER_SEC) + 'px';
    ph.style.display = 'block';

    /* Faz o scroll seguir o playhead */
    const scroll = document.getElementById('roll-scroll');
    if (scroll) {
      const phX = elapsed * PX_PER_SEC;
      const viewW = scroll.clientWidth;
      if (phX > scroll.scrollLeft + viewW - 40) {
        scroll.scrollLeft = phX - viewW / 2;
      }
    }

    if (elapsed < totalDuration + 0.3 && isPlaying) {
      playheadAnimId = requestAnimationFrame(frame);
    }
  }

  playheadAnimId = requestAnimationFrame(frame);
}

function resetPlayhead() {
  if (playheadAnimId) cancelAnimationFrame(playheadAnimId);
  const ph = document.getElementById('roll-playhead');
  if (ph) { ph.style.left = '0'; ph.style.display = 'none'; }
}


/* ══════════════════════════════════════════════════════════
   10. SALVAR E CARREGAR MELODIAS (localStorage)
══════════════════════════════════════════════════════════ */

/** Retorna todas as melodias salvas */
function getSavedMelodies() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Salva a melodia atual com o nome digitado */
function saveMelody() {
  if (currentMelody.length === 0) {
    showToast('⚠ NENHUMA NOTA GRAVADA!');
    return;
  }

  const input = document.getElementById('melody-name');
  const name  = input.value.trim() || `Melodia ${new Date().toLocaleTimeString('pt-BR')}`;

  const totalDuration = currentMelody.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration), 0
  );

  const melody = {
    id:        Date.now(),
    name,
    createdAt: new Date().toLocaleString('pt-BR'),
    notes:     [...currentMelody],
    waveform:  currentWave,
    duration:  totalDuration,
    noteCount: currentMelody.length,
  };

  const all = getSavedMelodies();
  all.unshift(melody);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  input.value = '';
  renderSavedList();
  showToast(`✓ "${name}" SALVA!`);
}

/** Carrega uma melodia salva para o editor */
function loadMelodyIntoEditor(id) {
  const melody = getSavedMelodies().find(m => m.id === id);
  if (!melody) return;

  if (isRecording) stopRecording();
  if (isPlaying)   stopPlayback();

  currentMelody = [...melody.notes];
  recordedNotes = [...melody.notes];
  currentWave   = melody.waveform || 'sine';

  /* Atualiza o botão de waveform */
  document.querySelectorAll('.wave-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.wave === currentWave);
  });

  document.getElementById('rec-time').textContent   = formatTime(melody.duration || 0);
  document.getElementById('notes-count').textContent = melody.noteCount;
  document.getElementById('melody-name').value       = melody.name;

  updateRecorderUI();
  renderPianoRoll(currentMelody);

  /* Scrolla até o gravador */
  document.getElementById('recorder').scrollIntoView({ behavior: 'smooth' });
  showToast(`✓ "${melody.name}" CARREGADA!`);
}