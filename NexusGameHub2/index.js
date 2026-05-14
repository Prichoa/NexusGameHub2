/* ════════════════════════════════════════════════════════════
   NexusGameHub — index.js
   Arquivo responsável por todas as animações do menu principal,
   transições e efeitos visuais. Inclui sistema de pontuação
   agregada dos três jogos.
═══════════════════════════════════════════════════════════ */

/* ── BACKGROUND CANVAS (partículas + linhas) ─────────────── */
// Obtém o elemento canvas do HTML para desenhar animações
const canvas = document.getElementById('bgCanvas');
// Obtém o contexto 2D para desenhar gráficos no canvas
const ctx    = canvas.getContext('2d');

/**
 * Função: redimensiona o canvas para ocupar a tela inteira
 * Parâmetros: nenhum
 * Retorna: void (sem retorno)
 * Uso: chamada quando a janela é redimensionada para manter o canvas responsivo
 */
function resizeCanvas() {
  canvas.width  = window.innerWidth;   // Define largura do canvas = largura da janela
  canvas.height = window.innerHeight;  // Define altura do canvas = altura da janela
}
resizeCanvas();  // Executa ao carregar a página
window.addEventListener('resize', resizeCanvas);  // Redimensiona quando a janela muda de tamanho

// VETOR de cores neon (roxo, ciano, verde) para as partículas
const PALETTE = ['#bf00ff', '#00ffcc', '#39ff14'];
// Constante: número total de partículas que serão animadas (80 pontos)
const NUM_P   = 80;

/**
 * VETOR: particles - Array contendo todos os dados das partículas
 * Cada elemento é um OBJETO com:
 *   - x, y: posição da partícula no canvas (coordenadas aleatórias)
 *   - vx, vy: velocidade em x e y (movimento suave)
 *   - r: raio da partícula (tamanho do ponto)
 *   - col: cor da partícula (escolhida aleatoriamente de PALETTE)
 *   - alpha: transparência da partícula (opacidade)
 * Este vetor é usado na função drawScene() para desenhar e animar cada ponto
 */
const particles = Array.from({ length: NUM_P }, () => ({
  x:     Math.random() * canvas.width,     // Posição X aleatória (0 até largura do canvas)
  y:     Math.random() * canvas.height,    // Posição Y aleatória (0 até altura do canvas)
  vx:    (Math.random() - .5) * .4,        // Velocidade X lenta e aleatória (-0.2 a 0.2)
  vy:    (Math.random() - .5) * .4,        // Velocidade Y lenta e aleatória (-0.2 a 0.2)
  r:     Math.random() * 1.8 + .5,         // Raio: entre 0.5 e 2.3 pixels
  col:   PALETTE[Math.floor(Math.random() * PALETTE.length)],  // Cor aleatória do vetor PALETTE
  alpha: Math.random() * .5 + .1           // Transparência: entre 0.1 e 0.6
}));

// Constante: distância máxima entre duas partículas para que sejam conectadas por uma linha
const LINK_DIST = 140;

/**
 * Função: drawScene()
 * Responsável por: desenhar TODAS as partículas e linhas de conexão a cada frame
 * Chamada: a cada 20ms pelo setInterval (50 FPS)
 * Lógica:
 *   1. Limpa o canvas anterior
 *   2. Desenha linhas conectando partículas próximas
 *   3. Atualiza posição de cada partícula
 *   4. Desenha halo (glow) e núcleo (ponto) de cada partícula
 */
function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // Apaga tudo o que foi desenhado antes

  /* ═══ DESENHAR CONEXÕES (linhas entre partículas) ═══ */  
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const d  = Math.hypot(dx, dy);
      if (d < LINK_DIST) {
        const a = (1 - d / LINK_DIST) * .15;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(191,0,255,${a})`;
        ctx.lineWidth   = .6;
        ctx.stroke();
      }
    }
  }

  /* ═══ ATUALIZAR E DESENHAR CADA PARTÍCULA ═══ */
  particles.forEach(p => {  // Para cada partícula no vetor
    // Atualizar posição: move partícula na direção da velocidade
    p.x += p.vx;  // Incrementa X pela velocidade em X
    p.y += p.vy;  // Incrementa Y pela velocidade em Y
    
    // Inverter velocidade se partícula bater na borda (rebote)
    if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;   // Toca esquerda/direita, inverte X
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;  // Toca topo/fundo, inverte Y

    /* ═══ DESENHAR HALO (brilho ao redor) ═══ */
    // Cria gradiente radial: centro sólido que desaparece nas bordas (efeito glow)
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
    grad.addColorStop(0, p.col + '22');    // Centro: cor com 20% opacidade
    grad.addColorStop(1, 'transparent');   // Bordas: transparente
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);  // Círculo grande (6x o raio)
    ctx.fillStyle = grad;
    ctx.fill();  // Preenche com gradiente (halo brilhoso)

    /* ═══ DESENHAR NÚCLEO (ponto central) ═══ */
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);  // Círculo menor no centro
    ctx.globalAlpha = p.alpha;               // Define opacidade da partícula
    ctx.fillStyle   = p.col;                 // Define cor
    ctx.fill();                              // Preenche o círculo
    ctx.globalAlpha = 1;                     // Restaura opacidade padrão
  });
}

// Executa drawScene a cada 20ms (50 vezes por segundo) para animação suave
setInterval(drawScene, 20);


/* ══════════════════════════════════════════════════════════
   TRANSIÇÃO ENTRADA → MENU PRINCIPAL
   Gerencia a animação de transição da tela inicial para o menu
═══════════════════════════════════════════════════════════ */
const entrance = document.getElementById('entrance');  // Elemento da tela de entrada
const app      = document.getElementById('app');      // Elemento do menu principal
let   launched = false;  // Flag para executar launch apenas uma vez

/**
 * Função: launch()
 * Responsável por: disparar a transição animada de entrada para menu
 * Parâmetros: nenhum
 * Retorna: void
 * Lógica:
 *   1. Impede múltiplas execuções com flag 'launched'
 *   2. Adiciona classe CSS 'out' à entrada (fade-out)
 *   3. Após 850ms, esconde entrada e mostra menu
 *   4. Inicia animações das estatísticas e cards
 */
function launch() {
  if (launched) return;  // Sai se já foi executada
  launched = true;       // Marca como executada

  entrance.classList.add('out');  // Adiciona animação de saída (CSS)

  // Após animação CSS terminar (850ms) navega para parte2.html
  setTimeout(() => {
    window.location.href = 'parte2.html';
  }, 850);
}

// Disparadores: clique no botão ou qualquer tecla pressionada ativa o menu
document.getElementById('startBtn').addEventListener('click', launch);
document.addEventListener('keydown', launch, { once: true });  // 'once: true' executa uma única vez


/* ══════════════════════════════════════════════════════════
   CONTAGEM ANIMADA DOS NÚMEROS
   Anima o contador de estatísticas com efeito de suavização
═══════════════════════════════════════════════════════════ */
/**
 * Função: countUp()
 * Responsável por: contar de 0 até um número-alvo com animação suave
 * Parâmetros:
 *   - el: elemento HTML a ser atualizado
 *   - target: número final desejado
 *   - duration: tempo em ms (padrão 900ms)
 * Retorna: void
 * Lógica: usa requestAnimationFrame para animar o incremento com easing quadrático
 */
function countUp(el, target, duration = 900) {
  if (target === 0) {   // Se alvo é 0, atualiza direto
    el.textContent = '0';
    return;
  }
  
  let start = null;  // Marca o momento inicial (null = não iniciado)
  
  // Função chamada a cada frame (60 FPS em navegadores modernos)
  const step = ts => {  // 'ts' = timestamp em milisegundos
    if (!start) start = ts;  // Na primeira chamada, salva o tempo inicial
    
    // Calcula progresso: 0 (início) a 1 (final)
    const p = Math.min((ts - start) / duration, 1);
    
    // Easing quadrático: p * p faz a animação começar rápida e desacelerar
    // Multiplica pelo target para obter o número atual
    el.textContent = Math.floor(p * p * target);
    
    // Se não alcançou 100%, continua animando
    if (p < 1) requestAnimationFrame(step);
    // Se terminou, garante que o número final é exato
    else el.textContent = target;
  };
  
  // Inicia a animação
  requestAnimationFrame(step);
}

/**
 * Função: animateStats()
 * Responsável por: carregar pontuações de todos os jogos e animar exibição
 * Parâmetros: nenhum
 * Retorna: void
 * Lógica:
 *   1. Carrega dados de cada jogo do localStorage
 *   2. Soma todas as vitórias e rodadas totais
 *   3. Anima os números com countUp()
 */
function animateStats() {
  // Carrega dados salvos de cada jogo (ou use valores padrão se não existir)
  const jp    = JSON.parse(localStorage.getItem('jp_score')    || '{"wins":0,"total":0}');
  const dados = JSON.parse(localStorage.getItem('dados_score') || '{"wins":0,"total":0}');
  const cc    = JSON.parse(localStorage.getItem('cc_score')    || '{"wins":0,"total":0}');

  // Soma as vitórias de todos os jogos (se valor não existe, usa 0)
  const wins  = (jp.wins  || 0) + (dados.wins  || 0) + (cc.wins  || 0);
  // Soma o total de rodadas de todos os jogos
  const total = (jp.total || 0) + (dados.total || 0) + (cc.total || 0);

  // Aguarda 200ms depois ativa a contagem animada
  setTimeout(() => {
    countUp(document.getElementById('statWins'),  wins,  1000);  // Anima vitórias totais
    countUp(document.getElementById('statGames'), total, 1000);   // Anima rodadas totais
  }, 200);
}


/* ══════════════════════════════════════════════════════════
   ATUALIZAR VITÓRIAS NOS CARDS DO MENU
   Exibe o número de vitórias de cada jogo individual
═══════════════════════════════════════════════════════════ */
/**
 * Função: updateScoreCards()
 * Responsável por: preencher os cards com vitórias específicas de cada jogo
 * Parâmetros: nenhum
 * Retorna: void
 */
function updateScoreCards() {
  // Carrega os dados salvos de cada jogo (localStorage)
  const jp    = JSON.parse(localStorage.getItem('jp_score')    || '{"wins":0}');
  const dados = JSON.parse(localStorage.getItem('dados_score') || '{"wins":0}');
  const cc    = JSON.parse(localStorage.getItem('cc_score')    || '{"wins":0}');

  // Atualiza o HTML dos cards com o número de vitórias de cada jogo
  document.getElementById('jpWins').textContent    = jp.wins    || 0;  // Jokenpo
  document.getElementById('dadosWins').textContent = dados.wins || 0;  // Dados
  document.getElementById('ccWins').textContent    = cc.wins    || 0;  // Cara ou Coroa
}


/* ══════════════════════════════════════════════════════════
   ANIMAR APARECIMENTO DOS CARDS
   Mostra os cards dos jogos com efeito de entrada em cascata
═══════════════════════════════════════════════════════════ */
/**
 * Função: revealCards()
 * Responsável por: animar a entrada dos 3 cards do menu
 * Parâmetros: nenhum
 * Retorna: void
 * Lógica: cada card aparece com delay, criando efeito em cascata
 */
function revealCards() {
  const cards = document.querySelectorAll('.card');  // Seleciona todos os cards
  
  cards.forEach((card, i) => {  // Para cada card (i = índice 0, 1, 2)
    // Estado inicial: invisível e mais abaixo
    card.style.opacity   = '0';           // Completamente transparente
    card.style.transform = 'translateY(40px)';  // 40px abaixo da posição final
    card.style.transition = 'none';       // Sem animação inicial

    // Após pequeno delay, ativa a transição
    setTimeout(() => {
      // Define transição com easing específico (cubic-bezier cria efeito springy)
      card.style.transition = `opacity .55s ease, transform .55s cubic-bezier(.175,.885,.32,1.275)`;
      card.style.opacity    = '1';        // Torna visível
      card.style.transform  = 'translateY(0)';  // Move para posição normal
    }, 120 + i * 130);  // Delay: 120ms + (índice * 130ms) = efeito cascata
  });
}


/* ══════════════════════════════════════════════════════════
   EFEITO 3D TILT AO PASSAR MOUSE
   Cards inclinam 3D seguindo a posição do mouse (parallax effect)
═══════════════════════════════════════════════════════════ */
/**
 * Lógica: ao mover o mouse sobre um card, ele rotaciona em 3D
 * para seguir a posição do cursor, criando efeito de profundidade.
 */
// Encapsula e reaplica as interações dos cards (pode ser chamado após injeção de HTML)
function bindCardInteractions() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const rx = ((e.clientY - cy) / (r.height / 2)) * 7;
      const ry = ((e.clientX - cx) / (r.width  / 2)) * -7;
      card.style.transform = `translateY(-10px) scale(1.015) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// Caso o HTML já contenha os cards (por exemplo em outra página), tenta aplicar as interações agora
bindCardInteractions();