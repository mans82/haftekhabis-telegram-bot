const utils = require('./src/utils');

test('Basic module functions', () => {
  expect(utils._isValidCard(22)).toBe(false);
  expect(utils._isValidCard('js')).toBe(false);
  expect(utils._isValidCard('♦1')).toBe(true);
  const rand1 = utils._random();
  const rand2 = utils._random();
  expect(rand1).not.toBe(rand2);
});


test('CardDeck class', () => {
  utils._constants.randomSeed = 82;
  expect(utils._constants.randomSeed).toBe(82);
  const deck = new utils.CardDeck();
  expect(utils._constants.randomSeed).toBe(83);
  expect(deck._cards.length).toBe(52);
  expect(deck._cards.slice().sort()).toEqual([
      '♦1', '♥1', '♠1', '♣1', '♦2', '♥2', '♠2',
      '♣2', '♦3', '♥3', '♠3', '♣3', '♦4', '♥4',
      '♠4', '♣4', '♦5', '♥5', '♠5', '♣5', '♦6',
      '♥6', '♠6', '♣6', '♦7', '♥7', '♠7', '♣7',
      '♦8', '♥8', '♠8', '♣8', '♦9', '♥9', '♠9',
      '♣9', '♦0', '♥0', '♠0', '♣0', '♦J', '♥J',
      '♠J', '♣J', '♦K', '♥K', '♠K', '♣K', '♦Q',
      '♥Q', '♠Q', '♣Q'
  ].sort());
  expect(deck.topCard).toBe('♥2');
  const copyOfCards = deck._cards.slice();
  const grabbedCard = deck.grabCard();
  expect(utils._isValidCard(grabbedCard)).toBe(true);
  expect(deck.topCard).not.toBe(grabbedCard);
  expect(deck.topCard).toBe(copyOfCards[14]);
  expect(grabbedCard).not.toBe(copyOfCards[14]);
  expect(deck._cards.length).toBe(51);
  expect(() => {
    deck.putCard('card');
  }).toThrow();
  expect(() => {
    deck.putCard('♥1');
  }).toThrow();
  expect(deck._cards.length).toBe(51);
  expect(() => {
    deck.putCard(grabbedCard);
  }).not.toThrow();
  expect(deck._cards.length).toBe(52);
  expect(deck.topCard).toBe(grabbedCard);
});

test('Player class', () => {
  const player = new utils.Player('Steve', '1234', '5678');
  expect(() => {
    player.ready = 'omlet';
  }).toThrow();
  const testCard = '♥2';
  player.giveCard(testCard);
  expect(() => {
    player.giveCard(testCard);
  }).toThrow();
  player.takeCard(testCard);
  expect(player._cards.length).toBe(0);
  expect(player.hasNoCard()).toBe(true);
  expect(() => {
    player.takeCard('♥4');
  }).toThrow();
  player.giveCard('♥2');
  player.giveCard('♥4');
  utils._constants.randomSeed = 82;
  const randomCard = player.takeCardRandom();
  expect(utils._isValidCard(randomCard)).toBe(true);
  expect(randomCard).toBe('♥2');
  expect(player._cards.length).toBe(1);
  expect(player.hasNoCard()).toBe(false);
});

const room = new utils.GameRoom();
const player1 = new utils.Player('Player1', '1111', '1001');
const player2 = new utils.Player('Player2', '2222', '2002');
const player3 = new utils.Player('Player3', '3333', '3003');
test('GameRoom: basic methods', () => {
  expect(() => {
    room.addPlayer('player');
  }).toThrow();
  room.addPlayer(player1);
  room.addPlayer(player2);
  room.addPlayer(player3);
  expect(room.players).toEqual([player1, player2, player3]);
  room.removePlayer('3333'); // Player 3
  expect(room.players).toEqual([player1, player2]);
  expect(() => {
    room.removePlayer('4444');
  }).toThrow();
  room.addPlayer(player3);
  expect(room.getPlayerByChatId('1111')).toBe(player1);
  expect(room.getPlayerByChatId('2222')).toBe(player2);
  expect(room.getPlayerByChatId('3333')).toBe(player3);
  expect(room.getPlayerByChatId('4444')).toBe(undefined);
  expect(room.isJoined('1111')).toBe(true);
  expect(room.isJoined('4321')).toBe(false);
});

test('Player: ready-changed signal', (done) => {
  player1.once('ready-changed', (state) => {
    expect(state).toBe(true);
    done();
  });
  player1.ready = true;
});

test('GameRoom: everyone-ready signal', (done) => {
  room.once('everyone-ready', () => {
    done();
  });
  player2.ready = true;
  player3.ready = true;
});

test('GameRoom: game start', () => {
  const initialMinPlayers = room.MIN_PLAYERS;
  const initialMaxPlayers = room.MAX_PLAYERS;
  room.MIN_PLAYERS = 10;
  expect(() => {
    room.startGame();
  }).toThrow();
  room.MIN_PLAYERS = initialMinPlayers;
  room.MAX_PLAYERS = 1;
  expect(() => {
    room.startGame();
  }).toThrow();
  room.MAX_PLAYERS = initialMaxPlayers;
  expect(() => {
    room.startGame();
  }).not.toThrow();
  expect(room.gameStarted).toBe(true);
  expect(player1.cards.length).toBe(room.INITIAL_CARDS);
  expect(player2.cards.length).toBe(room.INITIAL_CARDS);
  expect(player3.cards.length).toBe(room.INITIAL_CARDS);
});

test('GameRoom: updateTurn()', () => {
  room._randomSeed = 82;
  // top card is ♥2.
  expect(room._isCompatible('♥2')).toBe(false);
  expect(room._isCompatible('♥J')).toBe(true);
  expect(room._isCompatible('card')).toBe(false);
  expect(room._currentTurn).toBe(0);
  room._updateTurn();
  expect(room._currentTurn).toBe(1);
  room._updateTurn();
  expect(room._currentTurn).toBe(2);
  room._updateTurn();
  expect(room._currentTurn).toBe(0);
  room.flow = -1;
  room._updateTurn(false);
  expect(room._currentTurn).toBe(2);
  room._updateTurn(false);
  expect(room._currentTurn).toBe(1);
  room._updateTurn(true);
  expect(room._currentTurn).toBe(2);
  room._currentTurn = 0;
  room.flow = 1;
});

test('GameRoom: play() handling of invalid cards', () => {
  expect(() => {
    room.play('card');
  }).toThrow();
  expect(() => {
    room.play('♥J');
  }).toThrow();
  expect(() => {
    room.play('♠1');
  }).toThrow();
});

test('GameRoom: turn-changed signal', (done) => {
  // Rebuild the deck, the harsh way!
  player1._cards = [
    '♥7',
    '♦2'
  ]
  player2._cards = [
    '♥3',
    '♥9',
    '♥8',
    '♠8',
    '♠3',
    '♠2',
    '♣6' // Dummy card
  ]
  player3._cards = [
    '♥1',
    '♠0'
  ]
  room._deck = new utils.CardDeck();
  for (let card of player1._cards){
    let index = room._deck._cards.indexOf(card);
    room._deck._cards.splice(index, 1);
  }
  for (let card of player2._cards){
    let index = room._deck._cards.indexOf(card);
    room._deck._cards.splice(index, 1);
  }
  for (let card of player3._cards){
    let index = room._deck._cards.indexOf(card);
    room._deck._cards.splice(index, 1);
  }
  room._deck._topCard = '♥5';
  room.once('turn-changed', () => {
    expect(player1.cards.length).toBe(1);
    expect(room.currentPenalty).toBe(room.SEVEN_CARD_PENALTY);
    expect(room._currentTurn).toBe(1);
    expect(room._deck.topCard).toBe('♥7');
    done();
  });
  room.play('♥7'); // player1 plays
});

test('GameRoom: playing cards that does not require emitting signals', () => {
  room.play('♥3'); // player2 plays
  expect(player2.cards.length).toBe(7 + room.SEVEN_CARD_PENALTY);
  expect(room.currentPenalty).toBe(0);
  expect(room._currentTurn).toBe(2);
  expect(room._deck.topCard).toBe('♥7');
  room.play('♥1'); // player3 plays
  expect(player3._cards.length).toBe(1);
  expect(room._currentTurn).toBe(1);
  room.play('♥8'); // player2 plays
  expect(room._currentTurn).toBe(1);
  expect(player2._cards.length).toBe(8);
  room.play('♠8'); // player2 plays
  expect(room._currentTurn).toBe(1);
  expect(player2._cards.length).toBe(7);
  room.play('♠3'); // player2 plays
  expect(room._currentTurn).toBe(2);
  expect(player2._cards.length).toBe(6);
  room.play('♠0'); // player3 plays
  expect(room.flow).toBe(-1);
  expect(room._deck.topCard).toBe('♠0');
  expect(room._currentTurn).toBe(1);
  expect(player3._cards.length).toBe(0); // Player 3 finishes playing
  expect(player3.rank).toBe(1); //Player3 ranks #1.
});

test('GameRoom: player-to-fine signal', (done) => {
  room.once('player-to-fine', (currentTurnPlayer) => {
    expect(currentTurnPlayer).toBe(player2);
    expect(player2._cards.length).toBe(4 + room.SEVEN_CARD_PENALTY);
    expect(player2._cards.includes('♠2')).toBe(true);
    expect(player1._cards.length).toBe(1);
    done();
  });
  room.play('♠2');
});

test('GameRoom: playing \'2\' card and giving fines', (done) => {
  room.once('turn-changed', () => {
    expect(player2._cards.length).toBe(2 + room.SEVEN_CARD_PENALTY);
    expect(player2._cards.includes('♠2')).toBe(false);
    expect(player1._cards.length).toBe(2);
    done();
  });
  room.play('♠2', player1); // player2 plays
});

test('GameRoom: finishing game and ranking players', (done) => {
  // removing player1 fine card so they will have only 1 card
  room.once('game-finished', () => {
    expect(room._currentTurn).toBe(0);
    expect(room.gameFinished).toBe(true);
    expect(player1.rank).toBe(2);
    expect(player2.rank).toBe(3);
    expect(player3.rank).toBe(1);
    done();
  });
  player1._cards.splice(player1._cards.indexOf('♥9'), 1);
  room.play('♦2'); // player1 plays
});