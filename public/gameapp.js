const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const PieceType = {
  NONE: 0,
  BLACK: 1,
  RED: 2
};

let playing = false;

// Color of each tile 
const colorBoard = [
  [2, 1, 2, 1, 2],
  [0, 0, 0, 0, 0],
  [1, 0, 0, 0, 2],
  [0, 0, 0, 0, 0],
  [1, 2, 1, 2, 1]
];

let selfId;
let playerNum; // 1 or 2

let width;
let height;
const tileSize = 96;

// Selected piece
let selected = {
  i: -1,
  j: -1
};
let movements = 0;
let turn = false;

function showModal(title, content) {
  $('#modal-title').html(title);
  $('#modal-content').html(content);
  $('#modal-info').modal('show');
}

document.getElementById('play-btn').addEventListener('click', play);
document.getElementById('opponent-id').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    play();
  } else if (event.key === ' ' || Number.isNaN(event.key)) { // TODO: change to REGEX
    event.preventDefault();
  }
});

/** Click the play button */
function play() {
  const opponentId = document.getElementById('opponent-id').value;

  if (opponentId === '') {
    return;
  }

  if (Number.isNaN(opponentId) || (opponentId.includes('.') || opponentId.length !== 6)) {
    showInfoModal('Invalid PIN', 'You must enter a 6 digit number PIN.');
    return;
  }

  socket.emit('play', {opponentId});
}

function loop() {
  if (playing) {
    requestAnimationFrame(loop);
  }
  
  draw();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const piece = board[j][i];

      ctx.fillStyle = typeToColor(colorBoard[j][i]);
      ctx.fillRect(i * tileSize, j * tileSize, tileSize, tileSize);

      // Draw the piece if there is one
      if (piece !== 0) {
        ctx.fillStyle = typeToColor(piece);
        ctx.beginPath();
        ctx.arc(i * tileSize + tileSize / 2, j * tileSize + tileSize / 2, tileSize / 4, 0, 2 * Math.PI);
        ctx.fill();

        // Piece border
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(i * tileSize + tileSize / 2, j * tileSize + tileSize / 2, tileSize / 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  if (selected.i !== -1 && selected.j !== -1) {
    ctx.strokeStyle = 'yellow';
  }

  ctx.beginPath();
  ctx.arc(selected.i * tileSize + tileSize / 2, selected.j * tileSize + tileSize / 2, tileSize / 4, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = 'black';
  // Draw vertical lines
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, height);
    ctx.stroke();
  }
  // Draw horizontal lines
  for (let j = 0; j < 5; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * tileSize);
    ctx.lineTo(width, j * tileSize);
    ctx.stroke();
  }
}

socket.on('self_id', (data) => {
  selfId = data.id;
  document.getElementById('self-id').innerHTML = selfId;
});

socket.on('start_game', (data) => {
  playerNum = data.playerNum;

  // Set the initial board layout.
  board = [
    [1, 2, 1, 2, 1],
    [0, 0, 0, 0, 0],
    [2, 0, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [2, 1, 2, 1, 2]
  ];

  selected.i = -1;
  selected.j = -1;

  movements = 0;

  width = canvas.width;
  height = canvas.height;

  ctx.lineWidth = 2;

  document.getElementById('form-wrapper').style.display = 'none';
  document.getElementById('game-wrapper').style.display = 'inline';
  document.getElementById('opponent-id').value = '';

  turn = playerNum === 1; // PlayerNum 1 (black pieces) play first.
  setTurnInfo();

  playing = true;

  requestAnimationFrame(loop);
});

socket.on('end_game', (data) => {
  playing = false;

  if (data.winner) {
    showModal(
      'You win!',
      `Congratulations! You won in ${movements} movements.`
    );
  } else {
    showModal(
      'You lose!',
      `Your opponent won in ${playerNum === 1 ? movements : (movements + 1)} movements.`
    );
  }

  // TODO: reset canvas
});

socket.on('board_update', (data) => {
  board = data.board;
  turn = true;
  setTurnInfo();
});

socket.on('opponent_disconnected', () => {
  playing = false;

  document.getElementById('game-wrapper').style.display = 'none';
  document.getElementById('form-wrapper').style.display = 'inline';

  showModal(
    'Opponent disconnected',
    'Your opponent has disconnected from the game.'
    );
});

canvas.addEventListener('click', (event) => {
  if (!playing || !turn) {
    return;
  }

  const rect = canvas.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const i = Math.floor(x / tileSize);
  const j = Math.floor(y / tileSize);

  if (board[j][i] === PieceType.NONE) {
    if (selected.i !== -1 && selected.j !== -1) {
      movePiece(selected.i, selected.j, i, j);
      socket.emit('move_piece', {
        fromX: selected.i,
        fromY: selected.j,
        toX: i,
        toY: j
      });
    }
  } else {
    if (i === selected.i && j === selected.j) { // Deselect selected tile
      selected.i = -1;
      selected.j = -1;
    } else if (board[j][i] === playerNum) { // Select tile if it's player's color
      selected.i = i;
      selected.j = j;
    }
  }
});

function movePiece(fromX, fromY, toX, toY) {
  if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0) {
    return;
  }

  if (fromX >= 5 || fromY >= 5 || toX >= 5 || toY >= 5) {
    return;
  }

  const xDif = toX - fromX;
  const yDif = toY - fromY;

  let currentX = fromX;
  let currentY = fromY;

  let canMove = true;

  while (!(currentX === toX && currentY === toY)) {
    if (xDif !== 0) {
      currentX += xDif / Math.abs(xDif);
    }
    
    if (yDif !== 0) {
      currentY += yDif / Math.abs(yDif);
    }

    if (board[currentY][currentX] !== 0) {
      canMove = false;
      break;
    }
  }

  if (!canMove) {
    return;
  }

  board[toY][toX] = board[fromY][fromX];
  board[fromY][fromX] = PieceType.NONE;

  socket.emit('move_piece', {fromX, fromY, toX, toY});
  movements += 1;
  turn = false;
  setTurnInfo();

  selected.i = -1;
  selected.j = -1;
}

function testWin() {
  for (let i = 0; i < 5; i++) {
    let horizontal = 0;
    let vertical = 0;

    for (let j = 0; j < 5; j++) {
      // Horizontal

      if (board[i][j] !== playerNum) {
        horizontal = 0;
      } else {
        horizontal++;
      }

      if (board[j][i] !== playerNum) {
        vertical = 0;
      } else {
        vertical++;
      }      

      if (horizontal >= 4 || vertical >= 4) {
        return true;
      }
    }
  }

  // 4 small diagonals (of max 4 pieces)
  let diagonals = [true, true, true, true];
  for (let i = 0; i < 4; i++) {
    if (board[i + 1][i] !== playerNum) {
      diagonals[0] = false;
    }
    if (board[i][i + 1] !== playerNum) {
      diagonals[1] = false;
    }
    if (board[i][3 - i] !== playerNum) {
      diagonals[2] = false;
    }
    if (board[i + 1][4 - i] !== playerNum) {
      diagonals[3] = false;
    }
  }

  for (let i = 0; i < diagonals.length; i++) {
    if (diagonals[i]) {
      return true;
    }
  }

  // 2 big diagonals (of max 5 pieces)
  let diagonal1 = 0;
  let diagonal2 = 0;
  for (let i = 0; i < 5; i++) {
    if (board[i][i] !== playerNum) {
      diagonal1 = 0;
    } else {
      diagonal1++;
    }
    if (board[i][4 - i] !== playerNum) {
      diagonal2 = 0;
    } else {
      diagonal2++;
    }

    if (diagonal1 >= 4  || diagonal2 >= 4) {
      return true;
    }
  }

  return false;
}

function setTurnInfo() {
  if (turn) {
    document.getElementById('turn').innerHTML = 'Your turn.'
  } else {
    document.getElementById('turn').innerHTML = 'Your opponent\'s turn.'
  }
}

function typeToColor(type) {
  switch (type) {
    case 0:
      return '#66BB6A';
    case 1:
      return '#212121';
    case 2:
      return '#D50000';
  }
}
