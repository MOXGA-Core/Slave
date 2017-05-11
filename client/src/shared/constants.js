const GameState = { NOT_STARTED: 'NotStarted', PLAYING: 'Playing', CARD_EXCHANGE: 'CardExchange', ENDED: 'Ended' };
const PlayerState = { PLAYING: 'Playing', OUT_OF_GAME: 'OutOfGame' };
const PlayerHitState = { HIT: 'Hit', PASS: 'Pass', WAITING: 'Waiting' };
const CardExchangeType = { NONE: 'None', FREE: 'Free', BEST: 'Best' };

const SocketInfo = {
  playRoomSocketUrl: '/api/playroom/socket',
  gameSocketUrl: '/api/game/socket'
};

const GameValidation = {
  minPlayerNameLength: 1,
  maxPlayerNameLength: 12,
  minPlayerCount: 4,
  maxPlayerCount: 8,
  minGameCount: 1,
  maxGameCount: 100
};

const TimerValues = {
  hitInactivityMaxPeriod: 45000,
  cardExchangeInactivityMaxPeriod: 60000,
  inactivityWarningTime: 15000
};

const MaxChatMessageLength = 200;

exports.GameState = GameState;
exports.PlayerState = PlayerState;
exports.PlayerHitState = PlayerHitState;
exports.CardExchangeType = CardExchangeType;
exports.SocketInfo = SocketInfo;
exports.GameValidation = GameValidation;
exports.TimerValues = TimerValues;
exports.MaxChatMessageLength = MaxChatMessageLength;
