const _ = require('lodash');
const Deck = require('./deck');
const Card = require('../../common/card');
const CpuPlayer = require('./cpuPlayer');
const tokenGenerator = require('../helpers/tokenGenerator');
const socketService = require('../services/socketService');
const CardHelper = require('../../common/cardHelper');
const { GameState, CardExchangeType } = require('../../common/constants');

const PlayingDirection = { CLOCKWISE: 'Clockwise', COUTERCLOCKWISE: 'Counterclockwise' };
const PlayingStatus = { HIT: 'Hit', PASS: 'Pass', WAITING: 'Waiting' };

class Game {

  // Parameters:
  // playerCount: the number of players in the game
  // shuffleDeck: true, if the deck is shuffled
  constructor(playerCount, shuffleDeck = true) {
    if (!Number.isInteger(playerCount) || playerCount < 1) {
      throw new Error('Invalid player count');
    }

    this._id = tokenGenerator.generateToken();
    this._playerCount = playerCount;
    this._players = [];
    this.initializeNewGame(shuffleDeck);
  }

  get id() {
    return this._id;
  }

  get turn() {
    return this._turn;
  }

  set turn(player) {
    this._turn = player;
  }

  get previousHit() {
    return this._previousHit;
  }

  get state() {
    return this._state;
  }

  // Registers a socket for the specified client
  // Returns true if succeeded, otherwise false
  registerSocket(clientId, socket) {
    let player = this._players.find(item => item.id === clientId);
    if (player) {
      player.socket = socket;
      return true;
    }
    return false;
  }

  initializeNewGame(shuffleDeck = true, state = GameState.NOT_STARTED) {
    this._deck = new Deck(shuffleDeck);
    this._players.forEach((player) => {
      player.hand = [];
    });
    this._table = [];
    this._previousHit = {
      player: null,
      cards: []
    };
    this._turn = null;
    this._state = state;
    this._playingDirection = PlayingDirection.CLOCKWISE;
  }

  isRevolution() {
    return this._playingDirection === PlayingDirection.COUTERCLOCKWISE;
  }

  addPlayer(player) {
    if (this._players.length === this._playerCount) {
      throw new Error('The player number was exceeded');
    }

    this._players.push(player);
  }

  // Deals the cards and sets the starting turn
  dealCards() {
    this._deck.deck.forEach((card, index) => {
      this._players[index % this._players.length].hand.push(card);
    });

    // The player with the two of clubs gets the starting turn
    this._turn = this._players.find(player =>
       CardHelper.findTwoOfClubs(player.hand) !== undefined
    );
  }

  // Validates the player and the hit
  validateHit(clientId, cards) {
    // Validate player id
    if (this._turn.id !== clientId) {
      return false;
    }

    // Validate that the player has the given cards
    if (!this._turn.hasCardsInHand(cards)) {
      return false;
    }

    return CardHelper.validateHit(cards, this._previousHit.cards, this._table.length === 0, this.isRevolution());
  }

  startGame() {
    this.dealCards();
    this._state = GameState.PLAYING;

    // If the first player in turn is CPU, start CPU game
    if (this._turn instanceof CpuPlayer) {
      setTimeout(() => {
        this.startCpuGame();
      }, 1000);
    }
  }

  startCpuGame() {
    // Don't play CPU turns automatically when testing
    if (process.env.NODE_ENV !== 'test') {
      this._turn.playTurn(this);
    }
  }

  // Plays the specified cards of the current player in turn.
  // Note that this method does not validate the hit.
  // Validate the hit by calling validateHit().
  playTurn(cards) {
    if (cards.length > 0) {
      this._previousHit.cards = [];
      this._previousHit.player = this._turn;
    }

    // Move cards from player's hand to the table
    cards.forEach((card) => {
      let handCard = this._turn.hand.find(item => Card.isEqual(item, card));
      this._turn.removeCardsFromHand([ handCard ]);
      this._table.push(handCard);
      this._previousHit.cards.push(card);
    });
    let remainingHand = this._turn.hand;
    // If finished playing, assign position
    if (remainingHand.length === 0) {
      this._turn.position = this.getNextPosition();
    }

    // Check revolution rule
    if (cards.length === 4) {
      this._playingDirection = this.isRevolution() ? PlayingDirection.CLOCKWISE : PlayingDirection.COUTERCLOCKWISE;
    }

    // Switch turn
    let index = this._players.indexOf(this._turn);
    do {
      index = this.isRevolution() ? index - 1 : index + 1;
      if (index === -1) {
        index = this._players.length - 1;
      }
      this._turn = this._players[index % this._players.length];

      // If full round without hits, clear the table
      if (this._turn === this._previousHit.player) {
        this._previousHit.cards = [];
      }
    }
    while (this._turn.hand.length === 0);

    // Check if the game ended
    if (this._players.filter(item => item.hand.length > 0).length === 1) {
      this._turn.position = this.getNextPosition();
      this.notifyForGameEnd();
      this.gameEnded();
    }
    else {
      this.notifyForHit();
      this.startCpuGame();
    }

    return remainingHand;
  }

  getNextPosition() {
    return Math.max(...this._players.map(item => item.position)) + 1;
  }

  notifyForHit() {
    socketService.emitToGame(this.id, 'turnChanged', { game: this.toJSON() });
  }

  notifyForGameEnd() {
    let results = this._players.map(player => ({
      name: player.name,
      isCpu: player instanceof CpuPlayer,
      position: player.position
    })).sort((first, second) => first.position - second.position);
    socketService.emitToGame(this.id, 'gameEnded', { game: this.toJSON(), results: results });
  }

  gameEnded() {
    this.initializeNewGame(true, GameState.CARD_EXCHANGE);
    this.dealCards();
    this._players.forEach((player) => {
      // Set exchange rule for all players
      let count = 0;
      if (player.position === 1 || player.position === this._players.length) {
        count = 2;
      }
      else if (player.position === 2 || player.position === this._players.length - 1) {
        count = 1;
      }
      let type = CardExchangeType.NONE;
      if (count > 0) {
        type = player.position <= (this._players.length / 2) ? CardExchangeType.FREE : CardExchangeType.BEST;
      }
      let toPlayer = this._players.find(item => item.position === this._players.length - player.position + 1);
      if (toPlayer === player) {
        toPlayer = null;
      }

      player.cardExchangeRule = {
        exchangeCount: count,
        exchangeType: type,
        toPlayer: toPlayer
      };

      // Select cards for exchange
      if (player instanceof CpuPlayer) {
        let cards = player.selectCardsForExchange();
        this.setCardsForExchange(player.id, cards);
      }
    });
  }

  getPlayingStatus(player) {
    if (this._previousHit.player != null) {
      let prevHitIdx = this._players.indexOf(this._previousHit.player);
      let playerIdx = this._players.indexOf(player);
      let turnIdx = this._players.indexOf(this._turn);

      let turnNumber = turnIdx > prevHitIdx ? turnIdx - prevHitIdx : (this._players.length - prevHitIdx) + turnIdx;
      let playerNumber = playerIdx > prevHitIdx ?
      playerIdx - prevHitIdx : (this._players.length - prevHitIdx) + playerIdx;
      // Invert index when revolution
      if (this.isRevolution() && turnNumber !== this._players.length) {
        turnNumber = this._players.length - turnNumber;
      }
      if (this.isRevolution() && playerNumber !== this._players.length) {
        playerNumber = this._players.length - playerNumber;
      }

      if (player === this._previousHit.player && player !== this._turn) {
        return PlayingStatus.HIT;
      }
      else if ((playerNumber < turnNumber) && player.hand.length > 0) {
        return PlayingStatus.PASS;
      }
    }
    return PlayingStatus.WAITING;
  }

  getCardsForExchange(clientId) {
    // Validate player
    let player = this._players.find(item => item.id === clientId);
    if (player === undefined) {
      return null;
    }

    return {
      cards: player.hand,
      exchangeRule: {
        exchangeCount: player.cardExchangeRule.exchangeCount,
        exchangeType: player.cardExchangeRule.exchangeType,
        toPlayer: player.cardExchangeRule.toPlayer.toShortJSON()
      }
    };
  }

  setCardsForExchange(clientId, cards) {
    // Validate player
    let player = this._players.find(item => item.id === clientId);
    if (player === undefined) {
      return false;
    }

    // Validate that the player has the given cards
    if (!player.hasCardsInHand(cards)) {
      return false;
    }

    // Validate that cards are not already given
    if (player.cardsForExchange != null) {
      return false;
    }

    // Validate cards against exchange rule
    if (player.cardExchangeRule.exchangeCount !== cards.length) {
      return false;
    }
    switch (player.cardExchangeRule.exchangeType) {
      case CardExchangeType.FREE:
        break;
      case CardExchangeType.BEST: {
        let bestCards = _.takeRight(player.hand.sort(CardHelper.compareCards), player.cardExchangeRule.exchangeCount);
        if (_.intersectionWith(bestCards, cards, Card.isEqual).length !== bestCards.length) {
          return false;
        }
        break;
      }
      case CardExchangeType.NONE:
      default:
        return false;
    }

    player.cardsForExchange = cards;

    // Check if everybody has selected cards for exchange
    let inCardExchange = this._players.filter(player => player.cardExchangeRule &&
      player.cardExchangeRule.exchangeType !== CardExchangeType.NONE);
    let hasChanged = inCardExchange.filter(player => player.cardsForExchange != null);
    if (inCardExchange.length === hasChanged.length) {
      this.exchangeCards(hasChanged);
    }

    return true;
  }

  exchangeCards(players) {
    players.forEach((player) => {
      player.removeCardsFromHand(player.cardsForExchange);
      player.cardExchangeRule.toPlayer.hand.push(...player.cardsForExchange);
      player.cardExchangeRule.toPlayer.notifyForCardExchange(player.cardsForExchange, player);
    });

    // TODO: start new game and notify
  }

  toJSON() {
    return {
      id: this._id,
      state: this._state,
      isFirstTurn: this._table.length === 0,
      isRevolution: this.isRevolution(),
      previousHit: this._previousHit.cards,
      players: this._players.map(player => ({
        name: player.name,
        isCpu: player instanceof CpuPlayer,
        cardCount: player.hand.length,
        turn: player === this._turn,
        status: this.getPlayingStatus(player)
      }))
    };
  }

}

module.exports = Game;
