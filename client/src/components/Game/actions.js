import { createAction } from 'redux-actions';

export const gameStarted = createAction('GAME_STARTED');
export const turnChanged = createAction('TURN_CHANGED');
export const gameEnded = createAction('GAME_ENDED');
export const selectedCardsChanged = createAction('SELECTED_CARDS_CHANGED');
export const cardsHit = createAction('CARDS_HIT');
export const cardExchangeRequested = createAction('CARD_EXCHANGE_REQUESTED');
export const cardsGiven = createAction('CARDS_GIVEN');
export const cardsExchanged = createAction('CARDS_EXCHANGED');
export const newRoundStarted = createAction('NEW_ROUND_STARTED');
