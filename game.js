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

// Map unicode piece symbols to image filenames (place images in ./pieces/)
const pieceImageMap = {
  '♖': 'rook-chess-white.png',
  '♜': 'rook-chess-black.png',
  '♘': 'horse-chess-white.png',
  '♞': 'horse-chess-black.png',
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
    // For non-pawn pieces: allow moving to any empty square or capturing adjacent squares as a simple fallback
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = gameState[nr][nc];
          if (target === '' || pieceColor(target) !== color) moves.push({ r: nr, c: nc });
        }
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
      if (dbg) dbg.textContent = 'All piece images loaded.';
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