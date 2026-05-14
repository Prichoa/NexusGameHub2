/* ════════════════════════════════════════════════════════════
   CARA OU COROA — caraoucoroa.js
   Sistema completo do jogo de moeda com flip 3D, placar e histórico.
═══════════════════════════════════════════════════════════ */

/* ── BACKGROUND CANVAS (efeito matriz) ─────────────────────── */
// Obtém elemento canvas para desenhar efeito de fundo animado
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
// Função que redimensiona o canvas quando a janela muda de tamanho
const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
resize(); 
window.addEventListener('resize', resize);

// VETOR: cores neon para o efeito de matriz no fundo
const COLS  = ['rgba(57,255,20,.22)','rgba(191,0,255,.18)','rgba(0,255,204,.12)'];
// String: caracteres que aparecem caindo no fundo (efeito chuva digital)
const CHARS = 'CARACOROAHT01◈◆';
// Número de colunas na matriz (baseado na largura da tela)
const cols  = Math.floor(innerWidth / 28);
// VETOR: posição Y de cada coluna (para efeito de chuva caindo)
const drops = Array.from({length:cols}, () => Math.random() * innerHeight / 20);

/**
 * Função: drawBg()
 * Desenha o efeito de fundo animado (chuva de caracteres)
 * Chamada: a cada 55ms para animar continuamente
 */
function drawBg() {
  // Preenche o fundo com cor semi-transparente (cria rastro decadente)
  ctx.fillStyle = 'rgba(4,2,14,.055)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Para cada coluna, desenha um caractere aleatório caindo
  drops.forEach((y, i) => {
    ctx.fillStyle = COLS[i % COLS.length];  // Alterna cores entre as 3 cores definidas
    ctx.font = '13px monospace';            // Fonte para caracteres
    ctx.globalAlpha = Math.random() * .35 + .05;  // Opacidade varia aleatoriamente
    // Desenha caractere aleatório na posição (coluna i, linha y*20)
    ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * 28, y * 20);
    ctx.globalAlpha = 1;  // Restaura opacidade normal
    
    // Se o caractere saiu da tela E há chance aleatória, reinicia do topo
    if (y * 20 > canvas.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;  // Move para a próxima posição (cai para baixo)
  });
}
// Executa drawBg a cada 55ms (aproximadamente 18 FPS)
setInterval(drawBg, 55);

/* ══════════════════════════════════════════════════════════════
   ESTADO DO JOGO (GAME STATE)
   Armazena todas as informações da partida (placar, histórico, etc)
════════════════════════════════════════════════════════════════ */
/**
 * OBJETO score: mantém dados da partida
 * Carregado do localStorage se existir, senão usa valores padrão
 * Propriedades:
 *   - wins: número de acertos do jogador
 *   - loses: número de erros do jogador
 *   - total: número total de jogadas
 *   - streak: sequência atual de vitórias
 *   - maxStreak: maior sequência alcançada
 *   - history[]: array com últimas 12 jogadas (data de cada partida)
 */
let score = JSON.parse(localStorage.getItem('cc_score') ||
  '{"wins":0,"loses":0,"total":0,"streak":0,"maxStreak":0,"history":[]}');

const coin        = document.getElementById('coin');           // Elemento moeda
const coinFace    = document.getElementById('coinFace');       // Face da moeda (Cara)
const coinBack    = document.getElementById('coinBack');       // Verso da moeda (Coroa)
const outName     = document.getElementById('coinOutName');    // Nome do resultado
const banner      = document.getElementById('resultBanner');   // Banner com mensagem
const winEl       = document.getElementById('scWins');         // Contador de vitórias
const totalEl     = document.getElementById('scTotal');        // Contador total
const loseEl      = document.getElementById('scLoses');        // Contador de derrotas
const streakCur   = document.getElementById('streakCur');      // Sequência atual
const streakMax   = document.getElementById('streakMax');      // Melhor sequência
const caraBtn     = document.getElementById('caraBtn');        // Botão "Cara"
const coroaBtn    = document.getElementById('coroaBtn');       // Botão "Coroa"

/**
 * Função: bumpNum()
 * Responsável por: fazer um elemento "pular" (animação de impacto)
 * Parâmetros:
 *   - el: elemento HTML a ser animado
 * Retorna: void
 * Lógica: remove classe 'bump', força reflow, e adiciona novamente
 *         para reiniciar a animação CSS
 */
function bumpNum(el) {
  el.classList.remove('bump');  // Remove classe de animação
  void el.offsetWidth;          // Força reflow do navegador (recompila o DOM)
  el.classList.add('bump');     // Adiciona novamente para ativar animação
}

/**
 * Função: updateHUD()
 * Responsável por: atualizar todos os números exibidos no placar
 * Parâmetros: nenhum
 * Retorna: void
 * Uso: chamada toda vez que o jogador termina uma rodada
 */
function updateHUD() {
  winEl.textContent   = score.wins;           // Mostra vitórias
  totalEl.textContent = score.total;          // Mostra total de jogadas
  loseEl.textContent  = score.loses;          // Mostra derrotas
  streakCur.textContent = score.streak;       // Mostra sequência atual
  streakMax.textContent = score.maxStreak;    // Mostra melhor sequência

  // Muda estilo da barra de sequência se atingiu 3+ vitórias (adiciona classe 'hot')
  const streakBar = document.getElementById('streakBar');
  if (streakBar) {
    streakBar.className = `streak-item${score.streak >= 3 ? ' hot' : ''}`;
  }
}

/**
 * Função: renderHistory()
 * Responsável por: mostrar o histórico das últimas 12 jogadas
 * Parâmetros: nenhum
 * Retorna: void
 * Lógica: transforma array score.history em HTML e exibe
 */
function renderHistory() {
  // Mapeia cada jogada do histórico em uma linha HTML
  document.getElementById('historyList').innerHTML = score.history.map(h => `
    <div class="h-row ${h.win ? 'win' : 'lose'}">
      <span class="h-rnd">R${h.round}</span>
      <span class="h-mid">Escolheu: ${h.choice.toUpperCase()} &nbsp;→&nbsp; Saiu: ${h.result.toUpperCase()}</span>
      <span class="h-res">${h.win ? 'ACERTOU' : 'ERROU'}</span>
    </div>`).join('');
}


let flipping = false;  // Flag: true enquanto a moeda está girando

/**
 * Função: choose()
 * Responsável por: executar uma rodada completa do jogo
 * Parâmetros:
 *   - side (string): 'cara' ou 'coroa' (escolha do jogador)
 * Retorna: void
 * Lógica:
 *   1. Anima a moeda girando
 *   2. Gera resultado aleatório
 *   3. Compara com escolha do jogador
 *   4. Atualiza placar e histórico
 */
function choose(side) {
  if (flipping) return;  // Impede múltiplas jogadas simultâneas
  flipping = true;       // Marca moeda como girando

  // Atualiza botões selecionados visualmente
  caraBtn.classList.toggle('selected', side === 'cara');
  coroaBtn.classList.toggle('selected', side === 'coroa');
  caraBtn.disabled = true;   // Desativa botões durante animação
  coroaBtn.disabled = true;

  // Limpa efeitos visuais anteriores
  coinFace.classList.remove('glow');
  coinBack.classList.remove('glow');
  banner.className = 'result-banner';
  outName.textContent = '···';  // Mostra "aguardando" durante animação
  outName.style.color = 'rgba(255,255,255,.3)';
  outName.style.textShadow = 'none';

  // Inicia animação de flip (giro) da moeda
  coin.classList.remove('flipping');
  void coin.offsetWidth;  // Força reflow
  coin.classList.add('flipping');  // Adiciona classe CSS que anima rotação

  // Após 950ms (duração da animação CSS), calcula resultado
  setTimeout(() => {
    // Gera resultado aleatório: 50% cara, 50% coroa
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    // Verifica se o jogador acertou
    const win    = result === side;
    
    // Remove animação de giro
    coin.classList.remove('flipping');

    // Aplica efeito visual (glow) na face que saiu
    if (result === 'cara')  coinFace.classList.add('glow');
    else                    coinBack.classList.add('glow');

    // Mostra o resultado com cores diferenciadas
    outName.textContent = result.toUpperCase();
    if (result === 'cara') {
      outName.style.color = 'var(--g)';  // Verde para cara
      outName.style.textShadow = '0 0 20px var(--g)';
    } else {
      outName.style.color = 'var(--p)';  // Roxo para coroa
      outName.style.textShadow = '0 0 20px var(--p)';
    }

    // ATUALIZA PLACAR
    if (win) {
      score.wins++;           // Incrementa vitórias
      score.streak++;         // Aumenta sequência
      // Verifica se bateu recorde de sequência
      if (score.streak > score.maxStreak) score.maxStreak = score.streak;
      bumpNum(winEl);         // Anima o número de vitórias
    } else {
      score.loses++;          // Incrementa derrotas
      score.streak = 0;       // Reseta sequência
      bumpNum(loseEl);        // Anima o número de derrotas
    }
    score.total++;  // Incrementa total de jogadas

    // Monta mensagem do resultado
    const cls = win ? 'win' : 'lose';
    const msg = win ? '🏆 VOCÊ ACERTOU!' : '💀 VOCÊ ERROU!';
    const sub = `Escolheu: ${side.toUpperCase()} — Saiu: ${result.toUpperCase()}`;
    
    // Exibe banner com resultado
    banner.className = `result-banner show ${cls}`;
    banner.innerHTML = `<span>${msg}</span><span class="result-sub">${sub}</span>`;

    // ADICIONA AO HISTÓRICO
    score.history.unshift({  // unshift adiciona no INÍCIO do array
      round: score.total,
      choice: side,
      result: result,
      win: win
    });
    // Mantém apenas as últimas 12 jogadas
    if (score.history.length > 12) score.history.pop();
    
    // SALVA NO NAVEGADOR
    localStorage.setItem('cc_score', JSON.stringify(score));

    // Atualiza interface
    updateHUD();
    renderHistory();

    // Reativa botões após 500ms
    setTimeout(() => {
      flipping = false;
      caraBtn.disabled  = false;
      coroaBtn.disabled = false;
    }, 500);
  }, 950);
}

/**
 * Função: resetScore()
 * Responsável por: zerar todos os dados da partida
 * Parâmetros: nenhum
 * Retorna: void
 * Uso: chamada quando jogador clica no botão "Reset"
 */
function resetScore() {
  // Cria novo objeto score com valores zerados
  score = {wins:0,loses:0,total:0,streak:0,maxStreak:0,history:[]};
  // Salva no localStorage
  localStorage.setItem('cc_score', JSON.stringify(score));
  
  // Remove efeitos visuais
  caraBtn.classList.remove('selected');
  coroaBtn.classList.remove('selected');
  coinFace.classList.remove('glow');
  coinBack.classList.remove('glow');
  outName.textContent = '—';  // Volta ao padrão
  outName.style.color = '';
  outName.style.textShadow = '';
  banner.className = 'result-banner';
  
  // Atualiza tela
  updateHUD();
  renderHistory();
}


// Carrega dados salvos na interface ao abrir a página
updateHUD();
renderHistory();