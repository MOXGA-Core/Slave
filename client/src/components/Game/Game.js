import React, { Component, PropTypes } from 'react';
import { browserHistory } from 'react-router';
import { Grid, Col, ControlLabel, FormControl } from 'react-bootstrap';
import io from 'socket.io-client';
import ErrorModal from '../Errors/ErrorModal';
import OtherPlayers from './OtherPlayers';
import Table from './Table';
import Player from './Player';
import Chat from '../Chat';
import ResultsModal from './modals/ResultsModal';
import DisconnectedModal from './modals/DisconnectedModal';
import { GameState, SocketInfo, TimerValues } from '../../shared/constants';

const ModalOpenDelay = 1000;

class Game extends Component {

  constructor(props) {
    super(props);

    this.state = {
      joinUrl: '',
      resultsClosedForGame: null,
      socket: null,
      socketConnected: false,
      showConnectionError: false
    };

    this.gameEnded = this.gameEnded.bind(this);
    this.onSocketException = this.onSocketException.bind(this);
    this.hideResultsModal = this.hideResultsModal.bind(this);
    this.handleJoinUrlFocus = this.handleJoinUrlFocus.bind(this);
  }

  componentWillMount() {
    if (this.props.gameId) {
      // Configure websocket
      const socket = io('', { path: SocketInfo.gameSocketUrl });

      // Connection events
      socket.on('connect', () => {
        this.setState({
          socketConnected: true,
          showConnectionError: false
        });
        socket.emit('joinGame', this.props.gameId, this.props.playerId);
      });
      socket.on('disconnect', () => {
        this.setState({
          socketConnected: false,
          showConnectionError: true
        });
      });

      // Game events
      socket.on('joinedPlayersChanged', this.props.onJoinedPlayersChanged);
      socket.on('gameStarted', this.props.onGameStarted);
      socket.on('gameUpdated', this.props.onGameUpdated);
      socket.on('gameEnded', this.gameEnded);
      socket.on('cardsExchanged', this.props.onCardsExchanged);
      socket.on('newRoundStarted', this.props.onNewRoundStarted);
      socket.on('exception', this.onSocketException);

      this.setState({
        socket: socket,
        joinUrl: `${window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)}join/` +
          `${this.props.gameId}`
      });
    }
    else {
      browserHistory.push('/home');
    }
  }

  componentWillUnmount() {
    if (this.state.socketConnected) {
      this.removeSocketListeners();

      if (this.props.gameId) {
        this.props.onQuitGame();
      }
    }
  }

  // 'exception' socket event is a signal that server has removed the player from the game
  onSocketException() {
    this.setState({
      socketConnected: false
    });
    this.removeSocketListeners();
    browserHistory.push('/home');
  }

  removeSocketListeners() {
    // Only removing of 'disconnect' event is required
    this.state.socket.removeAllListeners('disconnect');
  }

  gameEnded(data) {
    this.props.onGameEnd(data);

    setTimeout(() => {
      this.props.toggleResultsModal(true);

      // Auto-close modal when inactive
      setTimeout((gameNumber) => {
        if (this.state.resultsClosedForGame == null || this.state.resultsClosedForGame < gameNumber) {
          this.hideResultsModal();
        }
      }, TimerValues.cardExchangeInactivityMaxPeriod - TimerValues.inactivityWarningTime - ModalOpenDelay,
        this.props.results.gameNumber);
    }, ModalOpenDelay);
  }

  hideResultsModal() {
    this.props.toggleResultsModal(false);

    this.setState({
      resultsClosedForGame: this.props.results.gameNumber
    });

    if (this.props.results.gameNumber < this.props.results.totalGameCount) {
      this.props.requestCardExchange();
    }
    else {
      browserHistory.push('/home');
    }
  }

  handleJoinUrlFocus(e) {
    e.target.select();
  }

  render() {
    const { gameId, playerCount, gameState, otherPlayers, table, isRevolution, player, showResultsModal, results,
      helpText } = this.props;

    return (
      <Grid className="Game" fluid>
        <ErrorModal />
        <Chat socket={this.state.socket} gameId={gameId} />
        {results &&
          <ResultsModal results={results} show={showResultsModal} onHide={this.hideResultsModal} />
        }
        <DisconnectedModal show={this.state.showConnectionError} />
        <OtherPlayers playerCount={playerCount} players={otherPlayers} />
        <div className="Game-table">
          {gameState === GameState.NOT_STARTED &&
            <div>
              <Col componentClass={ControlLabel} sm={6} md={3} mdOffset={3}>
                Share this link to your friends, so they can join the game!
              </Col>
              <Col sm={6} md={3}>
                <FormControl type="text" value={this.state.joinUrl} readOnly onFocus={this.handleJoinUrlFocus} />
              </Col>
            </div>
          }
          {gameState !== GameState.NOT_STARTED &&
            <div>
              <div className="Game-direction">
                {!isRevolution && <img src="/images/clockwise.png" alt="Clockwise" />}
                {isRevolution && <img src="/images/counterclockwise.png" alt="Revolution" />}
              </div>
              <Table table={table} />
            </div>
          }
        </div>
        {helpText && <p>{helpText}</p>}
        {player.player &&
          <Player {...player} onHit={this.props.onCardsHit} onCardsChange={this.props.onCardSelectionChange} />
        }
      </Grid>
    );
  }
}

Game.propTypes = {
  playerCount: PropTypes.number,
  otherPlayers: PropTypes.array,
  table: PropTypes.array,
  isRevolution: PropTypes.bool,
  player: PropTypes.object,
  results: PropTypes.object,
  helpText: PropTypes.string
};

export default Game;
