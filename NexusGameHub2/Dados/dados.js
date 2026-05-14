/* ════════════════════════════════════════════════════════════
   BATALHA DE DADOS — dados.js
   Sistema completo do jogo de dados com animação de spinner,
   lógica de comparação e placar.
═══════════════════════════════════════════════════════════ */

/* ── BACKGROUND CANVAS (efeito matriz) ────────────────────── */
// Obtém elemento canvas para desenhar efeito de fundo animado
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
// Função que redimensiona o canvas quando a janela muda de tamanho
const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
resize();
window.addEventListener('resize', resize);

// VETOR: cores neon para o efeito de fundo tipo matriz
const COLS  = ['rgba(0,255,204,.22)','rgba(57,255,20,.15)','rgba(191,0,255,.12)'];
// String: caracteres que caem no fundo (números e símbolos de dados)
const CHARS = '123456⚀⚁⚂⚃⚄⚅◈∑';
const cols  = Math.floor(innerWidth / 28);
// VETOR: posição Y de cada coluna (para chuva de caracteres)
const drops = Array.from({length:cols}, () => Math.random() * innerHeight / 20);

/**
 * Função: drawBg()
 * Desenha o efeito de fundo animado (chuva de dados)
 * Chamada: a cada 55ms para animar continuamente
 */
function drawBg() {
  ctx.fillStyle = 'rgba(4,2,14,.055)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drops.forEach((y, i) => {
    ctx.fillStyle = COLS[i % COLS.length];
    ctx.font = '14px monospace';
    ctx.globalAlpha = Math.random() * .35 + .05;
    ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * 28, y * 20);
    ctx.globalAlpha = 1;
    if (y * 20 > canvas.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;
  });
}
setInterval(drawBg, 55);

/* ════════════════════════════════════════════════════════════
   DADOS - CONSTANTES E DADOS DE JOGO
════════════════════════════════════════════════════════════ */
/**
 * VETOR FACES: contém os 6 símbolos Unicode que representam as faces de um dado
 * Usados para exibir visualmente qual número saiu
 * Índice 0 = 1 ponto, Índice 1 = 2 pontos, ... Índice 5 = 6 pontos
 */
const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

/**
 * OBJETO score: mantém dados da partida
 * Carregado do localStorage se existir, senão usa valores padrão
 * Propriedades:
 *   - wins: vitórias do jogador
 *   - draws: empates
 *   - loses: derrotas do jogador
 *   - total: total de rodadas jogadas
 *   - history[]: array com as últimas 12 rodadas
 */
let score = JSON.parse(localStorage.getItem('dados_score') ||
  '{"wins":0,"draws":0,"loses":0,"total":0,"history":[]}');

/* ── REFERÊNCIAS DOM - ELEMENTOS HTML A SEREM MANIPULADOS ────── */
const playerDice = document.getElementById('playerDice');  // Dado do jogador (visual)
const cpuDice    = document.getElementById('cpuDice');     // Dado da CPU (visual)
const playerNum  = document.getElementById('playerNum');   // Número do dado do jogador
const cpuNum     = document.getElementById('cpuNum');      // Número do dado da CPU
const banner     = document.getElementById('resultBanner'); // Mensagem do resultado
const rollBtn    = document.getElementById('rollBtn');     // Botão \"Lançar Dados\"
const winEl      = document.getElementById('scWins');      // Contador de vitórias
const drawEl     = document.getElementById('scDraws');     // Contador de empates
const loseEl     = document.getElementById('scLoses');     // Contador de derrotas

/* ── FUNÇÕES AUXILIARES ──────────────────────────────────────── */
/**
 * Função: bumpNum()
 * Faz um elemento \"pular\" com animação de impacto
 * Parâmetros: el (elemento HTML a ser animado)
 */
function bumpNum(el) {
  el.classList.remove('bump');  // Remove animação anterior
  void el.offsetWidth;          // Força reflow (reinicia o DOM)
  el.classList.add('bump');     // Ativa animação novamente
}

/**
 * Função: updateHUD()
 * Atualiza os números no placar (vitórias, empates, derrotas)
 * Chamada toda vez que uma rodada termina
 */
function updateHUD() {
  winEl.textContent  = score.wins;   // Mostra vitórias
  drawEl.textContent = score.draws;  // Mostra empates
  loseEl.textContent = score.loses;  // Mostra derrotas
}

/**
 * Função: renderHistory()
 * Exibe o histórico das últimas 12 rodadas em formato visual
 * Lógica: transforma array score.history em HTML com cores (win/draw/lose)
 */
function renderHistory() {
  // Mapeia cada rodada do histórico em uma linha HTML
  document.getElementById('historyList').innerHTML = score.history.map(h => `
    <div class="h-row ${h.result}">
      <span class="h-rnd">R${h.round}</span>
      <span class="h-mid">${FACES[h.player-1]} ${h.player} &nbsp;vs&nbsp; ${h.cpu} ${FACES[h.cpu-1]}</span>
      <span class="h-res">${h.result==='win'?'VITÓRIA':h.result==='draw'?'EMPATE':'DERROTA'}</span>
    </div>`).join('');
}

/* ── ROLL ────────────────────────────────────────────────── */
let rolling = false;

function rollDice() {
  if (rolling) return;
  rolling = true;
  rollBtn.disabled = true;

  // Reset glows
  playerDice.className = 'dice spin-anim';
  cpuDice.className    = 'dice spin-anim';
  banner.className = 'result-banner';
  playerNum.className = 'dice-num';
  cpuNum.className    = 'dice-num';
  playerNum.textContent = '–';
  cpuNum.textContent    = '–';

  // Shuffle animation
  let ticks = 0;
  const iv = setInterval(() => {
    playerDice.textContent = FACES[Math.floor(Math.random() * 6)];
    cpuDice.textContent    = FACES[Math.floor(Math.random() * 6)];
    ticks++;
    if (ticks >= 12) {
      clearInterval(iv);
      finalize();
    }
  }, 55);
}

function finalize() {
  const pNum = Math.floor(Math.random() * 6) + 1;
  const cNum = Math.floor(Math.random() * 6) + 1;

  playerDice.className = 'dice';
  cpuDice.className    = 'dice';
  playerDice.textContent = FACES[pNum - 1];
  cpuDice.textContent    = FACES[cNum - 1];
  playerNum.textContent  = pNum;
  cpuNum.textContent     = cNum;
  playerNum.className    = 'dice-num big';
  cpuNum.className       = 'dice-num big';

  let result, cls, msg, sub;
  if (pNum > cNum) {
    result='win'; cls='win';
    msg='🏆 VOCÊ VENCEU!'; sub=`Seu dado: ${pNum} — CPU: ${cNum}`;
    playerDice.classList.add('glow-win'); cpuDice.classList.add('glow-lose');
    score.wins++;
  } else if (pNum < cNum) {
    result='lose'; cls='lose';
    msg='💀 CPU VENCEU!'; sub=`Seu dado: ${pNum} — CPU: ${cNum}`;
    playerDice.classList.add('glow-lose'); cpuDice.classList.add('glow-win');
    score.loses++;
  } else {
    result='draw'; cls='draw';
    msg='🤝 EMPATE!'; sub=`Ambos tiraram ${pNum}`;
    playerDice.classList.add('glow-draw'); cpuDice.classList.add('glow-draw');
    score.draws++;
  }
  score.total++;

  banner.className = `result-banner show ${cls}`;
  banner.innerHTML = `<span>${msg}</span><span class="result-sub">${sub}</span>`;

  if (result==='win')  bumpNum(winEl);
  if (result==='lose') bumpNum(loseEl);
  if (result==='draw') bumpNum(drawEl);

  score.history.unshift({ round:score.total, player:pNum, cpu:cNum, result });
  if (score.history.length > 12) score.history.pop();
  localStorage.setItem('dados_score', JSON.stringify(score));

  updateHUD(); renderHistory();
  setTimeout(() => { rolling = false; rollBtn.disabled = false; }, 450);
}

/* ── RESET ───────────────────────────────────────────────── */
function resetScore() {
  score = {wins:0,draws:0,loses:0,total:0,history:[]};
  localStorage.setItem('dados_score', JSON.stringify(score));
  playerDice.className = 'dice'; cpuDice.className = 'dice';
  playerDice.textContent = '🎲'; cpuDice.textContent = '🎲';
  playerNum.className = 'dice-num'; cpuNum.className = 'dice-num';
  playerNum.textContent = '–'; cpuNum.textContent = '–';
  banner.className = 'result-banner';
  updateHUD(); renderHistory();
}

/* ── INIT ────────────────────────────────────────────────── */
updateHUD();
renderHistory();