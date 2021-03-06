import React, { Component, PropTypes } from 'react';
import { Row, Col, FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';
import UsernameInput from '../General/UsernameInput';

class Join extends Component {

  componentWillMount() {
    this.props.onGameIdChanged(this.props.params.id);
    if (this.props.isAuthenticated) {
      this.props.onJoinGame();
    }
  }

  joinGame(e) {
    e.preventDefault();
    this.props.onJoinGame();
  }

  render() {
    const { gameId, isButtonDisabled, isValid } = this.props;

    return (
      <div className="Join">
        <h2 className="Slave-header">Join a game!</h2>
        <Row className="Home-game-form">
          <Col md={4} sm={6} mdOffset={4} smOffset={3}>
            <form onSubmit={e => this.joinGame(e)}>
              <FormGroup controlId="gameId">
                <ControlLabel>Game ID</ControlLabel>
                <FormControl
                  type="text"
                  value={gameId}
                  onChange={e => this.props.onGameIdChanged(e.target.value)}
                />
              </FormGroup>
              <UsernameInput controlId="playerName" showRegistrationText />
              <FormGroup>
                <FormGroup>
                  <Button type="submit" disabled={isButtonDisabled || !isValid}>Join game</Button>
                </FormGroup>
              </FormGroup>
            </form>
          </Col>
        </Row>
      </div>
    );
  }

}

Join.PropTypes = {
  gameId: PropTypes.string.isRequired,
  isButtonDisabled: PropTypes.bool.isRequired,
  isValid: PropTypes.bool.isRequired,
  isAuthenticated: PropTypes.bool.isRequired
};

export default Join;
