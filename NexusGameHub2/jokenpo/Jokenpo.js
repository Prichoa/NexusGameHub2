/* ── BACKGROUND ──────────────────────────────────────────── */
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
resize(); window.addEventListener('resize', resize);

const COLS  = ['rgba(191,0,255,.28)','rgba(0,255,204,.18)','rgba(57,255,20,.15)'];
const CHARS = '01✊🖐✌◈◆∑∂';
const cols  = Math.floor(innerWidth / 28);
const drops = Array.from({length:cols}, () => Math.random() * innerHeight / 20);

function drawBg() {
  ctx.fillStyle = 'rgba(4,2,14,.06)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drops.forEach((y, i) => {
    ctx.fillStyle = COLS[i % COLS.length];
    ctx.font = '13px monospace';
    ctx.globalAlpha = Math.random() * .4 + .05;
    ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * 28, y * 20);
    ctx.globalAlpha = 1;
    if (y * 20 > canvas.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;
  });
}
setInterval(drawBg, 55);

/* ════════════════════════════════════════════════════════════
   DADOS DO JOGO - CONSTANTES
════════════════════════════════════════════════════════════ */
/**
 * OBJETO CHOICES: define as 3 opções do jogo
 * Cada opção contém:
 *   - icon: emoji representativo
 *   - label: nome em português
 *   - beats: qual opção ela vence
 * Exemplo: rock (pedra) vence scissors (tesoura)
 */
const CHOICES = {
  rock:     { icon:'✊', label:'PEDRA',   beats:'scissors' },  // Pedra vence tesoura
  paper:    { icon:'🖐️',  label:'PAPEL',   beats:'rock'     },  // Papel vence pedra
  scissors: { icon:'✌️',  label:'TESOURA', beats:'paper'    }   // Tesoura vence papel
};
// VETOR: opções disponíveis para a CPU escolher aleatoriamente
const CPU_OPTIONS = ['rock','paper','scissors'];

/**
 * OBJETO score: mantém dados da partida
 * Carregado do localStorage se existir, senão usa valores padrão
 * Propriedades:
 *   - wins: vitórias do jogador
 *   - draws: empates
 *   - loses: derrotas do jogador
 *   - total: total de rodadas jogadas
 *   - streak: sequência atual de vitórias
 *   - maxStreak: maior sequência alcançada
 *   - history[]: array com as últimas 12 rodadas
 */
let score  = JSON.parse(localStorage.getItem('jp_score') ||
  '{"wins":0,"draws":0,"loses":0,"total":0,"streak":0,"maxStreak":0,"history":[]}');

/* ── REFERÊNCIAS DOM - ELEMENTOS HTML A SEREM MANIPULADOS ────── */
const playerEl  = document.getElementById('playerChoice');  // Círculo da escolha do jogador
const cpuEl     = document.getElementById('cpuChoice');     // Círculo da escolha da CPU
const banner    = document.getElementById('resultBanner');  // Banner com mensagem de resultado
const winEl     = document.getElementById('scWins');        // Contador de vitórias
const drawEl    = document.getElementById('scDraws');       // Contador de empates
const loseEl    = document.getElementById('scLoses');       // Contador de derrotas
const streakVal = document.getElementById('streakVal');     // Sequência de vitórias atual

/* ── FUNÇÕES AUXILIARES ──────────────────────────────────────── */
/**
 * Função: bumpNum()
 * Faz um elemento "pular" com animação de impacto
 * Parâmetros: el (elemento HTML a ser animado)
 */
function bumpNum(el) {
  el.classList.remove('bump');  // Remove animação anterior
  void el.offsetWidth;          // Força reflow (reinicia o DOM)
  el.classList.add('bump');     // Ativa animação novamente
}

/**
 * Função: updateHUD()
 * Atualiza os números no placar (vitórias, empates, derrotas, sequência)
 * Chamada toda vez que uma rodada termina
 */
function updateHUD() {
  winEl.textContent  = score.wins;                          // Mostra vitórias
  drawEl.textContent = score.draws;                         // Mostra empates
  loseEl.textContent = score.loses;                         // Mostra derrotas
  // Exibe sequência atual com plural correto (1 vitória, 2 vitórias, etc)
  streakVal.textContent = `${score.streak} vitória${score.streak !== 1 ? 's' : ''}`;
}

/**
 * Função: renderHistory()
 * Exibe o histórico das últimas 12 rodadas em formato visual
 * Lógica: transforma array score.history em HTML com cores (win/draw/lose)
 */
function renderHistory() {
  const list = document.getElementById('historyList');
  // Mapeia cada rodada do histórico em uma linha HTML
  list.innerHTML = score.history.map(h => `
    <div class="h-row ${h.result}">
      <span class="h-rnd">R${h.round}</span>
      <span class="h-mid">${CHOICES[h.player].icon} ${CHOICES[h.player].label} vs ${CHOICES[h.cpu].label} ${CHOICES[h.cpu].icon}</span>
      <span class="h-res">${h.result === 'win' ? 'VITÓRIA' : h.result === 'draw' ? 'EMPATE' : 'DERROTA'}</span>
    </div>`).join('');
}

/* ── MAIN PLAY ───────────────────────────────────────────── */
let playing = false;

function play(playerChoice) {
  if (playing) return;
  playing = true;

  const cpuChoice = CPU_OPTIONS[Math.floor(Math.random() * 3)];

  // Animate choice circles
  const removeClass = cl => {
    cl.classList.remove('pop','result-win','result-lose','result-draw');
  };
  removeClass(playerEl); removeClass(cpuEl);
  void playerEl.offsetWidth;

  playerEl.textContent = CHOICES[playerChoice].icon;
  cpuEl.textContent    = CHOICES[cpuChoice].icon;
  playerEl.classList.add('pop');
  cpuEl.classList.add('pop');

  // Determine outcome
  let result, msg, sub, cls;
  if (playerChoice === cpuChoice) {
    result = 'draw'; cls = 'draw';
    msg = '🤝 EMPATE!';
    sub = `Ambos escolheram ${CHOICES[playerChoice].label}`;
    score.draws++; score.streak = 0;
  } else if (CHOICES[playerChoice].beats === cpuChoice) {
    result = 'win'; cls = 'win';
    msg = '🏆 VOCÊ VENCEU!';
    sub = `${CHOICES[playerChoice].label} bate ${CHOICES[cpuChoice].label}`;
    score.wins++; score.streak++;
    if (score.streak > score.maxStreak) score.maxStreak = score.streak;
  } else {
    result = 'lose'; cls = 'lose';
    msg = '💀 CPU VENCEU!';
    sub = `${CHOICES[cpuChoice].label} bate ${CHOICES[playerChoice].label}`;
    score.loses++; score.streak = 0;
  }
  score.total++;

  // Glow circles
  const glowClass = result === 'win'  ? 'result-win'
                  : result === 'lose' ? 'result-lose'
                  : 'result-draw';
  setTimeout(() => {
    playerEl.classList.add(glowClass);
    cpuEl.classList.add(result === 'win' ? 'result-lose' : result === 'lose' ? 'result-win' : 'result-draw');
  }, 200);

  // Banner
  banner.className = `result-banner show ${cls}`;
  banner.innerHTML = `<span>${msg}</span><span class="result-sub">${sub}</span>`;

  // Bump scores
  if (result === 'win')  bumpNum(winEl);
  if (result === 'lose') bumpNum(loseEl);
  if (result === 'draw') bumpNum(drawEl);

  // History
  score.history.unshift({ round:score.total, player:playerChoice, cpu:cpuChoice, result });
  if (score.history.length > 12) score.history.pop();

  localStorage.setItem('jp_score', JSON.stringify(score));
  updateHUD(); renderHistory();
  setTimeout(() => { playing = false; }, 600);
}

/* ── KEYBOARD SHORTCUTS ──────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === '1') play('rock');
  if (e.key === '2') play('paper');
  if (e.key === '3') play('scissors');
});

/* ── RESET ───────────────────────────────────────────────── */
function resetScore() {
  score = {wins:0,draws:0,loses:0,total:0,streak:0,maxStreak:0,history:[]};
  localStorage.setItem('jp_score', JSON.stringify(score));
  playerEl.textContent = '❓'; cpuEl.textContent = '❓';
  playerEl.className = 'choice-display';
  cpuEl.className    = 'choice-display';
  banner.className   = 'result-banner';
  updateHUD(); renderHistory();
}

/* ── INIT ────────────────────────────────────────────────── */
updateHUD();
renderHistory();