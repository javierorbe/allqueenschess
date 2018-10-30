const path = require('path');
const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');
const Game = require('./Game.js');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const port = process.env.PORT || 3000;

// Setup express
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(port, () => console.log(`Listening on port ${port}`));

const sockets = new Map(); // <number, Socket> [playerId, socket]
const players = new Map(); // <number, Game>   [playerId, game]
const games = new Set(); //   <Game>

/**
 * Generate a random integer within a range.
 *
 * @param {number} min Minimum value of the random number.
 * @param {number} max Maximum value of the random number.
 * @returns {number} A random integer within the range.
 */
function randomNumberRange(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
}

/**
 * Create a new random player id (6 digit number).
 *
 * @returns {number} A new player id.
 */
function newRandomId() {
  let id;

  do {
    id = randomNumberRange(100000, 999999);
  } while (sockets.has(id));

  return id;
}

io.on('connection', (socket) => {
  const id = newRandomId();

  socket.id = id;
  sockets.set(id, socket);
  socket.emit('self_id', { id });

  /* Player wants to start a new game. */
  socket.on('play', (data) => {
    if (data.opponentId === undefined || Number.isNaN(data.opponentId)) {
      return;
    }

    const opponentId = Number(data.opponentId);

    if (opponentId === id) {
      socket.emit('error', {
        title: 'Invalid PIN',
        msg: 'You can\'t play against yourself!'
      });
    } else if (sockets.has(opponentId)) {
      if (players.has(opponentId)) {
        socket.emit('already_playing');
      } else {
        const game = new Game(id, opponentId);
        games.add(game);
        players.set(id, game);
        players.set(opponentId, game);

        socket.emit('start_game', {playerNum: 1});
        sockets.get(opponentId).emit('start_game', {playerNum: 2});
      }
    } else {
      socket.emit('error', 'not_exist_pin');
    }
  });

  /** Player clicks on a tile that can be moved. */
  socket.on('move_piece', (data) => {
    if (data.fromX == null || data.fromY == null || data.toX == null || data.toY == null) {
      return;
    }

    if (players.has(id)) {
      const game = players.get(id);
      if (game.move(id, data.fromX, data.fromY, data.toX, data.toY)) {
        const opponentId = game.getOpponent(id);

        sockets.get(opponentId).emit('board_update', {
          board: game.board
        });

        if (game.hasWon(id)) {
          socket.emit('end_game', {winner: true});
          sockets.get(opponentId).emit('end_game', {winner: false});

          games.delete(game);
          players.delete(id);
          players.delete(opponentId);
        }
      }
    }
  });
  
  /** Player disconnects */
  socket.on('disconnect', () => {
    if (players.has(id)) {
      const game = players.get(id);

      let opponentId = game.playerId1;
      if (opponentId === id) {
        opponentId = game.playerId2;
      }

      sockets.get(opponentId).emit('opponent_disconnected');

      games.delete(game);
      players.delete(id);
      players.delete(opponentId);
    }

    sockets.delete(id);
  });
});