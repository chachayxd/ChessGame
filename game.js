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

// Helper to clear highlights
function clearHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('selected', 'move');
  });
}

// Render the board
function renderBoard() {
  board.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + c) % 2 ? 'black' : 'white');
      cell.textContent = gameState[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', onCellClick);
      board.appendChild(cell);
    }
  }
}

// Simple move logic: select a piece, then move to empty square or capture
function onCellClick(e) {
  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row, 10);
  const c = parseInt(cell.dataset.col, 10);
  const piece = gameState[r][c];

  if (selectedCell) {
    // Move if a piece was selected and we click another cell
    if (selectedPos && (selectedPos.row !== r || selectedPos.col !== c)) {
      // Move piece, ignore move legality for now
      gameState[r][c] = gameState[selectedPos.row][selectedPos.col];
      gameState[selectedPos.row][selectedPos.col] = "";
    }
    clearHighlights();
    selectedCell = null;
    selectedPos = null;
    renderBoard();
  } else if (piece) {
    // Select only if there's a piece
    clearHighlights();
    cell.classList.add('selected');
    selectedCell = cell;
    selectedPos = { row: r, col: c };
  }
}

renderBoard();