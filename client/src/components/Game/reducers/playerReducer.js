import _ from 'lodash';
import { handleActions } from 'redux-actions';
import {
  gameRequested,
  turnChanged,
  gameEnded,
  selectedCardsChanged,
  cardsHit,
  cardExchangeRequested,
  cardsExchanged,
  newRoundStarted } from '../actions';
import CardHelper from '../../../../../common/cardHelper';
import Card from '../../../../../common/card';
import { GameState, CardExchangeType } from '../../../../../common/constants';

const initialState = {
  player: null,
  cards: null,
  selectedCards: [],
  buttonText: null,
  canHit: false,
  exchangeRule: null
};

const getButtonText = (gameState, selectedCards, exchangeRule) => {
  switch (gameState) {
    case GameState.PLAYING:
      return selectedCards.length > 0 ? 'Hit' : 'Pass';
    case GameState.CARD_EXCHANGE:
      return exchangeRule.exchangeType === CardExchangeType.NONE ? 'Waiting...' : 'Give cards';
    case GameState.NOT_STARTED:
    case GameState.ENDED:
    default:
      return null;
  }
};

const canHit = (gameState, turn, selectedCards, table, isFirstTurn, isRevolution, exchangeRule) => {
  switch (gameState) {
    case GameState.PLAYING:
      return turn && CardHelper.validateHit(selectedCards, table, isFirstTurn, isRevolution);
    case GameState.CARD_EXCHANGE:
      if (exchangeRule.exchangeType !== CardExchangeType.NONE) {
        return selectedCards.length === exchangeRule.exchangeCount;
      }
      return false;
    case GameState.NOT_STARTED:
    case GameState.ENDED:
    default:
      return false;
  }
};

const getSelectedCardsForExchange = (cards, exchangeRule) =>
  (exchangeRule.exchangeType === CardExchangeType.BEST ? _.takeRight(cards, exchangeRule.exchangeCount) : []);

const getSelectedCardsAfterExchange = (cards, cardsToSelect) =>
  _.intersectionWith(cards, cardsToSelect, Card.isEqual);

const playerReducer = handleActions({
  [gameRequested]: (state, action) => Object.assign({}, state.player, {
    player: action.payload.game.players[action.payload.playerIndex],
    cards: action.payload.player.cards.sort(CardHelper.compareCards),
    buttonText: getButtonText(action.payload.game.state, state.player.selectedCards, state.player.exchangeRule)
  }),
  [turnChanged]: (state, action) => Object.assign({}, state.player, {
    player: action.payload.game.players[state.playerIndex],
    buttonText: getButtonText(action.payload.game.state, state.player.selectedCards, state.player.exchangeRule),
    canHit: canHit(action.payload.game.state, action.payload.game.players[state.playerIndex].turn,
      state.player.selectedCards, action.payload.game.previousHit, action.payload.game.isFirstTurn,
      action.payload.game.isRevolution, null)
  }),
  [gameEnded]: state => Object.assign({}, state.player, {
    canHit: false
  }),
  [selectedCardsChanged]: (state, action) => Object.assign({}, state.player, {
    selectedCards: action.payload,
    buttonText: getButtonText(state.gameState, action.payload, state.player.exchangeRule),
    canHit: canHit(state.gameState, state.player.player.turn, action.payload, state.table, state.isFirstTurn,
      state.isRevolution, state.player.exchangeRule)

  }),
  [cardsHit]: (state, action) => Object.assign({}, state.player, {
    cards: action.payload.cards.sort(CardHelper.compareCards),
    selectedCards: [],
    buttonText: getButtonText(state.gameState, [], state.player.exchangeRule),
    canHit: false
  }),
  [cardExchangeRequested]: (state, action) => {
    let cards = action.payload.cards.sort(CardHelper.compareCards);
    let selectedCards = getSelectedCardsForExchange(cards, action.payload.exchangeRule);
    return Object.assign({}, state.player, {
      cards: cards,
      selectedCards: selectedCards,
      buttonText: getButtonText(action.payload.game.state, selectedCards, action.payload.exchangeRule),
      canHit: canHit(action.payload.game.state, state.player.player.turn, selectedCards, state.table,
        state.isFirstTurn, state.isRevolution, action.payload.exchangeRule),
      exchangeRule: action.payload.exchangeRule
    });
  },
  [cardsExchanged]: (state, action) => {
    let cards = action.payload.cards.sort(CardHelper.compareCards);
    let selectedCards = getSelectedCardsAfterExchange(cards, action.payload.exchangedCards.cards);
    return Object.assign({}, state.player, {
      cards: cards,
      selectedCards: selectedCards,
      buttonText: 'Waiting...',
      canHit: false
    });
  },
  [newRoundStarted]: (state, action) => Object.assign({}, state.player, {
    selectedCards: [],
    buttonText: getButtonText(action.payload.game.state, [], state.player.exchangeRule),
    canHit: canHit(action.payload.game.state, action.payload.game.players[state.playerIndex].turn, [],
      action.payload.game.previousHit, action.payload.game.isFirstTurn, action.payload.game.isRevolution, null),
    exchangeRule: null
  })
}, initialState);

export default playerReducer;
