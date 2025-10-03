// Unicode chess symbols
const initialBoard = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],
  ["♟","♟","♟","♟","♟","♟","♟","♟"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["♙","♙","♙","♙","♙","♙","♙","♙"],
  ["♖","♘","♗","♕","♔","♗","♘","♖"]
];

const board = document.getElementById('chessboard');
let selectedCell = null;
let selectedPos = null;
let gameState = JSON.parse(JSON.stringify(initialBoard)); // Deep copy
let turn = 'white'; // 'white' or 'black'
// AI settings
let aiEnabled = false;
let aiColor = 'black';

// Hook UI elements (if present)
function initAIControls() {
  const toggle = document.getElementById('aiToggle');
  const select = document.getElementById('aiColor');
  if (toggle) {
    toggle.addEventListener('change', (e) => { aiEnabled = e.target.checked; maybeTriggerAI(); });
  }
  if (select) {
    select.addEventListener('change', (e) => { aiColor = e.target.value; maybeTriggerAI(); });
    aiColor = select.value;
  }
}

// Map unicode piece symbols to image filenames (place images in ./pieces/)
const pieceImageMap = {
  // swapped so the white symbol uses the black image and vice-versa per user request
  '♖': 'rook-chess-black.png',
  '♜': 'rook-chess-white.png',
  '♘': 'horse-chess-black.png',
  '♞': 'horse-chess-white.png',
  '♗': 'bishop-chess-white.png',
  '♝': 'bishop-chess-black.png',
  '♙': 'pawn-chess-white.png',
  '♟': 'pawn-chess-black.png',
  '♕': 'queen-chess-white.png',
  '♛': 'queen-chess-black.png',
  '♔': 'king-chess-white.png',
  '♚': 'king-chess-black.png'
};

// Helper to clear highlights
function clearHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('selected', 'move');
    cell.classList.remove('capture');
    delete cell.dataset.moveTarget;
  });
}

// Render the board
function renderBoard() {
  board.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + c) % 2 ? 'black' : 'white');
      // Render image if present in pieces/, otherwise fall back to unicode
      const pieceSym = gameState[r][c];
      const imgSrc = pieceToImageSrc(pieceSym);
      if (imgSrc) {
        // include a data-symbol and an onerror handler to fall back to the unicode if image fails to load
        const safeSym = pieceSym || '';
        cell.innerHTML = `<img src="${imgSrc}" class="piece-img" alt="" data-symbol="${safeSym}" onerror="this.parentElement.textContent=this.dataset.symbol">`;
      } else {
        cell.textContent = pieceSym;
      }
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', onCellClick);
      // keyboard accessibility: Enter or Space activates the cell
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onCellClick({ currentTarget: cell });
        }
      });
      board.appendChild(cell);
    }
  }
}

function pieceToImageSrc(pieceSym) {
  if (!pieceSym) return null;
  const file = pieceImageMap[pieceSym];
  if (!file) return null;
  // Return a relative path to the pieces folder
  return `pieces/${file}`;
}

// Simple move logic: select a piece, then move to empty square or capture
function onCellClick(e) {
  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row, 10);
  const c = parseInt(cell.dataset.col, 10);
  const piece = gameState[r][c];
  // If clicking a highlighted move target, perform the move
  if (cell.dataset.moveTarget === 'true' && selectedPos) {
    performMove(selectedPos.row, selectedPos.col, r, c);
    clearHighlights();
    selectedCell = null;
    selectedPos = null;
    renderBoard();
    return;
  }

  // If there is a selected piece, clicking elsewhere clears selection
  if (selectedCell) {
    clearHighlights();
    selectedCell = null;
    selectedPos = null;
    // If clicking another of the player's pieces, reselect below
  }

  // Select a piece (only if it's the correct side to move)
  if (piece) {
    const color = pieceColor(piece);
    if (!color) return; // unknown symbol
    if (color !== turn) return; // not this player's turn

    clearHighlights();
    cell.classList.add('selected');
    selectedCell = cell;
    selectedPos = { row: r, col: c };

    // Show legal moves for pawns; for other pieces fallback to allow any empty/capture (optional)
    const moves = getLegalMoves(r, c, piece);
    moves.forEach(m => {
      const selector = `.cell[data-row="${m.r}"][data-col="${m.c}"]`;
      const target = document.querySelector(selector);
      if (target) {
        target.classList.add('move');
        target.dataset.moveTarget = 'true';
        // mark capture targets differently
        if (gameState[m.r][m.c] !== '') {
          target.classList.add('capture');
        }
      }
    });
  }
}

// After each human move, if AI is enabled and it's the AI's turn, trigger it
function maybeTriggerAI() {
  // If AI not enabled, do nothing
  if (!aiEnabled) return;
  // If it's AI's turn, make a move after a short delay
  if (turn === aiColor) {
    setTimeout(() => aiMakeMove(), 400);
  }
}

// Simple AI: choose a random legal move for the AI color
function aiMakeMove() {
  // collect all legal moves for AI pieces
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameState[r][c];
      if (!piece) continue;
      if (pieceColor(piece) !== aiColor) continue;
      const legal = getLegalMoves(r, c, piece);
      legal.forEach(m => moves.push({ sr: r, sc: c, tr: m.r, tc: m.c }));
    }
  }
  if (moves.length === 0) return; // no move available
  const choice = moves[Math.floor(Math.random() * moves.length)];
  performMove(choice.sr, choice.sc, choice.tr, choice.tc);
  clearHighlights();
  renderBoard();
}

function performMove(sr, sc, tr, tc) {
  const piece = gameState[sr][sc];
  // Move
  gameState[tr][tc] = piece;
  gameState[sr][sc] = "";

  // Pawn promotion (auto-queen)
  if (piece === '♙' && tr === 0) gameState[tr][tc] = '♕';
  if (piece === '♟' && tr === 7) gameState[tr][tc] = '♛';

  // Switch turn
  turn = (turn === 'white') ? 'black' : 'white';
  updateStatus();
  // If AI is enabled and it's now AI's turn, trigger it
  maybeTriggerAI();
}

// Determine piece color by symbol
function pieceColor(piece) {
  if (!piece) return null;
  const white = ['♙','♖','♘','♗','♕','♔'];
  const black = ['♟','♜','♞','♝','♛','♚'];
  if (white.includes(piece)) return 'white';
  if (black.includes(piece)) return 'black';
  return null;
}

// Return legal moves for a pawn at (r,c). Does not handle en-passant.
function getLegalMoves(r, c, piece) {
  const moves = [];
  const color = pieceColor(piece);
  if (!color) return moves;

  // White pawns move up (decreasing r), black pawns move down (increasing r)
  if (piece === '♙') {
    // one forward
    if (r - 1 >= 0 && gameState[r-1][c] === '') moves.push({ r: r-1, c });
    // two forward from starting rank
    if (r === 6 && gameState[5][c] === '' && gameState[4][c] === '') moves.push({ r: 4, c });
    // captures
    if (r - 1 >= 0 && c - 1 >= 0 && pieceColor(gameState[r-1][c-1]) === 'black') moves.push({ r: r-1, c: c-1 });
    if (r - 1 >= 0 && c + 1 < 8 && pieceColor(gameState[r-1][c+1]) === 'black') moves.push({ r: r-1, c: c+1 });
  } else if (piece === '♟') {
    // black pawn
    if (r + 1 < 8 && gameState[r+1][c] === '') moves.push({ r: r+1, c });
    if (r === 1 && gameState[2][c] === '' && gameState[3][c] === '') moves.push({ r: 3, c });
    if (r + 1 < 8 && c - 1 >= 0 && pieceColor(gameState[r+1][c-1]) === 'white') moves.push({ r: r+1, c: c-1 });
    if (r + 1 < 8 && c + 1 < 8 && pieceColor(gameState[r+1][c+1]) === 'white') moves.push({ r: r+1, c: c+1 });
  } else {
    // Determine piece type by its symbol and generate moves accordingly
    const sym = piece;
    // Helper: push if on board and either empty or opponent
    function pushIfOK(nr, nc) {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const tgt = gameState[nr][nc];
      if (tgt === '') {
        moves.push({ r: nr, c: nc });
        return true; // empty square, sliding pieces can continue
      }
      if (pieceColor(tgt) !== color) {
        moves.push({ r: nr, c: nc });
      }
      return false; // occupied, sliding pieces must stop
    }

    // Knight (horse) moves: L-shaped
    if (sym === '♘' || sym === '♞') {
      const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      deltas.forEach(d => {
        const nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const tgt = gameState[nr][nc];
          if (tgt === '' || pieceColor(tgt) !== color) moves.push({ r: nr, c: nc });
        }
      });
    }

    // King: one square any direction
    else if (sym === '♔' || sym === '♚') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const tgt = gameState[nr][nc];
            if (tgt === '' || pieceColor(tgt) !== color) moves.push({ r: nr, c: nc });
          }
        }
      }
    }

    // Sliding pieces: bishop, rook, queen
    else {
      const isBishop = (sym === '♗' || sym === '♝');
      const isRook = (sym === '♖' || sym === '♜');
      const isQueen = (sym === '♕' || sym === '♛');

      // Bishop directions (diagonals)
      if (isBishop || isQueen) {
        const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        dirs.forEach(d => {
          let nr = r + d[0], nc = c + d[1];
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const cont = pushIfOK(nr, nc);
            if (!cont) break;
            nr += d[0]; nc += d[1];
          }
        });
      }

      // Rook directions (orthogonal)
      if (isRook || isQueen) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        dirs.forEach(d => {
          let nr = r + d[0], nc = c + d[1];
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const cont = pushIfOK(nr, nc);
            if (!cont) break;
            nr += d[0]; nc += d[1];
          }
        });
      }
    }
  }

  return moves;
}

function updateStatus() {
  const el = document.getElementById('status');
  if (el) el.textContent = `Turn: ${turn[0].toUpperCase() + turn.slice(1)}`;
}

// initial status
updateStatus();

// Debug: preload piece images to detect missing files and help diagnose why images aren't used
function preloadPieceImages() {
  const files = Array.from(new Set(Object.values(pieceImageMap)));
  const missing = [];
  let remaining = files.length;
  if (remaining === 0) {
    renderBoard();
    return;
  }
  files.forEach(file => {
    const img = new Image();
    img.onload = () => {
      console.log('[pieces] loaded:', file);
      remaining -= 1;
      if (remaining === 0) finish();
    };
    img.onerror = () => {
      console.warn('[pieces] missing or failed to load:', file);
      missing.push(file);
      remaining -= 1;
      if (remaining === 0) finish();
    };
    img.src = `pieces/${file}`;
  });

  function finish() {
    const dbg = document.getElementById('debug');
    if (missing.length) {
      const msg = 'Missing piece images: ' + missing.join(', ');
      console.warn(msg);
      if (dbg) dbg.textContent = msg + ' — check filenames in the pieces/ folder.';
    } else {
      // Do not display a positive "All piece images loaded" message — keep the debug area empty when all is well.
      if (dbg) dbg.textContent = '';
    }
    renderBoard();
  }
}

// create debug element if missing
if (!document.getElementById('debug')) {
  const header = document.querySelector('header');
  if (header) {
    const div = document.createElement('div');
    div.id = 'debug';
    header.appendChild(div);
  }
}

preloadPieceImages();
// initialize AI UI hooks
initAIControls();