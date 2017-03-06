const Game = require('../models/game');
const HumanPlayer = require('../models/humanPlayer');
const CpuPlayer = require('../models/cpuPlayer');

const PlayerCount = 4;

class GameService {

  constructor() {
    this._games = new Map();
  }

  // Creates a new game with one human player
  // Returns the game and the player
  createGame(shuffleDeck = true) {
    // Create game, players and deal cards
    let game = new Game(PlayerCount, shuffleDeck);
    let human = new HumanPlayer('You');
    game.addPlayer(human);
    for (let i = 0; i < PlayerCount - 1; ++i) {
      game.addPlayer(new CpuPlayer('CPU ' + (i + 1)));
    }
    game.dealCards();

    // If the first player in turn is CPU, start CPU game
    if (game.turn instanceof CpuPlayer) {
      setTimeout((game) => {
        game.startCpuGame();
      }, 1000, game);
    }

    this._games.set(game.id, game);
    return { game: game, player: human };
  }

  // Gets a game with the specified id
  // Returns null if the game doesn't exist
  getGame(id) {
    if (!this._games.has(id)) {
      return null;
    }
    return this._games.get(id);
  }
}

const gameService = new GameService();

module.exports = gameService;
