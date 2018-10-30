const PieceType = {
  NONE: 0,
  BLACK: 1,
  RED: 2
};

const K = 5;

class Piece {
  constructor(type) {
    this.type = type;
  }
}

class Game {
  constructor(playerId1, playerId2) {
    this.board = [
      [1, 2, 1, 2, 1],
      [0, 0, 0, 0, 0],
      [2, 0, 0, 0, 1],
      [0, 0, 0, 0, 0],
      [2, 1, 2, 1, 2]
    ];

    this.playerId1 = playerId1;
    this.playerId2 = playerId2;

    this.turn = this.playerId1;
  }

  /**
   * Get the opponent of the player.
   * 
   * @param {number} player - Player ID.
   */
  getOpponent(player) {
    return player === this.playerId1 ? this.playerId2 : this.playerId1;
  }

  /**
   * Test if a piece can be moved.
   * 
   * @param {number} fromX - From X
   * @param {number} fromY - From Y
   * @param {number} toX - To X
   * @param {number} toY - To Y
   */
  canMovePiece(fromX, fromY, toX, toY) {
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
  
      if (this.board[currentY][currentX] !== 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * A player moves a piece and winning testing is executed.
   * 
   * @param {number} player - Player ID.
   * @param {number} fromX - From X
   * @param {number} fromY - From Y
   * @param {number} toX - To X
   * @param {number} toY - To Y
   */
  move(player, fromX, fromY, toX, toY) {
    if (this.turn !== player) {
      return false;
    }

    if (this.canMovePiece(fromX, fromY, toX, toY)) {
      this.board[toY][toX] = this.board[fromY][fromX];
      this.board[fromY][fromX] = PieceType.NONE;

      this.turn = this.turn === this.playerId1 ? this.playerId2 : this.playerId1;

      return true;
    }
  }
  
  /**
   * Test if a player has won.
   * 
   * @param {number} player - Player ID.
   */
  hasWon(player) {
    const playerNum = this.playerId1 === player ? 1 : 2;

    for (let i = 0; i < 5; i++) {
      let horizontal = 0;
      let vertical = 0;
  
      for (let j = 0; j < 5; j++) {
        // Horizontal
        if (this.board[i][j] !== playerNum) {
          horizontal = 0;
        } else {
          horizontal++;
        }
  
        // Vertical
        if (this.board[j][i] !== playerNum) {
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
      if (this.board[i + 1][i] !== playerNum) {
        diagonals[0] = false;
      }
      if (this.board[i][i + 1] !== playerNum) {
        diagonals[1] = false;
      }
      if (this.board[i][3 - i] !== playerNum) {
        diagonals[2] = false;
      }
      if (this.board[i + 1][4 - i] !== playerNum) {
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
      if (this.board[i][i] !== playerNum) {
        diagonal1 = 0;
      } else {
        diagonal1++;
      }
      if (this.board[i][4 - i] !== playerNum) {
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
}

module.exports = Game;