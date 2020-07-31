var utils = require('./src/utils');

test('Base class', () => {
  // just importing a class that subclasses Base.
  let dummyObj = new utils.CardDeck();
  expect(dummyObj._isValidCard(22)).toBe(false);
  expect(dummyObj._isValidCard('js')).toBe(false);
  expect(dummyObj._isValidCard('♦1')).toBe(true);
  dummyObj._randomSeed = 82;
  let random1 = dummyObj._random();
  dummyObj._randomSeed = 83;
  let random2 = dummyObj._random();
  expect(random1).not.toBe(random2);
});

test('CardDeck class', () => {
  let deck = new utils.CardDeck();
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
  // deck._randomSeed = 82;
  expect(deck.topCard).toBe('♥2');
  let copyOfCards = deck._cards.slice();
  let grabbedCard = deck.grabCard();
  expect(deck._isValidCard(grabbedCard)).toBe(true);
  expect(deck.topCard).not.toBe(grabbedCard);
  expect(deck.topCard).toBe(copyOfCards[14]);
  expect(grabbedCard).not.toBe(copyOfCards[14]);
  expect(deck._cards.length).toBe(51);
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
  let player = new utils.Player('Steve', '1234', '5678');
  expect(() => {
    player.ready = 'omlet';
  }).toThrow();
  let testCard = '♥2';
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
  let randomCard = player.takeCardRandom();
  player._randomSeed = 82;
  expect(player._isValidCard(randomCard)).toBe(true);
  expect(randomCard).toBe('♥2');
  expect(player._cards.length).toBe(1);
  expect(player.hasNoCard()).toBe(false);
});

test('GameRoom class', () => {
  let room = new utils.GameRoom();
  let player1 = new utils.Player('Player1', '1111', '1001');
  let player2 = new utils.Player('Player2', '2222', '2002');
  let player3 = new utils.Player('Player3', '3333', '3003');
  let mockEmitter = {
    lastSignal : '',
    on() {return},
    emit(singal, callback) {this.lastSignal = singal}
  };
  player1._eventemitter = {...mockEmitter};
  player2._eventemitter = {...mockEmitter};
  player3._eventemitter = {...mockEmitter};
  room._eventemitter = mockEmitter;
  expect(() => {
    room.addPlayer('player');
  }).toThrow();
  room.addPlayer(player1);
  room.addPlayer(player2);
  room.addPlayer(player3);
  expect(room.players).toEqual([player1, player2, player3]);
  expect(room.getPlayerByChatId('1111')).toBe(player1);
  expect(room.getPlayerByChatId('2222')).toBe(player2);
  expect(room.getPlayerByChatId('3333')).toBe(player3);
  expect(() => {
    room.getPlayerByChatId('4444');
  }).toThrow();
  expect(room.isJoined('1111')).toBe(true);
  expect(room.isJoined('4321')).toBe(false);
  player1.ready = true;
  expect(player1._eventemitter.lastSignal).toBe('ready-changed');
  room._checkEveryoneReady();
  expect(room._eventemitter.lastSignal).not.toBe('everyone-ready');
  player2.ready = true;
  expect(player2._eventemitter.lastSignal).toBe('ready-changed');
  room._checkEveryoneReady();
  expect(room._eventemitter.lastSignal).not.toBe('everyone-ready');
  player3.ready = true;
  expect(player3._eventemitter.lastSignal).toBe('ready-changed');
  room._checkEveryoneReady();
  expect(room._eventemitter.lastSignal).toBe('everyone-ready');
  let initialMinPlayers = room.MIN_PLAYERS;
  let initialMaxPlayers = room.MAX_PLAYERS;
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
  expect(room._gameShouldFinish()).toBe(false);
  expect(() => {
    room.play('card');
  }).toThrow();
  expect(() => {
    room.play('♥J');
  }).toThrow();
  expect(() => {
    room.play('♠1');
  }).toThrow();
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
  // Rebuild the deck, the harsh way!
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
  room.play('♥7'); // player1 plays
  expect(player1.cards.length).toBe(1);
  expect(room.currentPenalty).toBe(room.SEVEN_CARD_PENALTY);
  expect(room._currentTurn).toBe(1);
  expect(room._eventemitter.lastSignal).toBe('turn-changed');
  expect(room._deck.topCard).toBe('♥7');
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
  room.play('♠2');
  expect(room._eventemitter.lastSignal).toBe('player-to-fine');
  room.play('♠2', player1); // player2 plays
  expect(player2._cards.length).toBe(4);
  expect(player2._cards.includes('♠2')).toBe(false);
  expect(player1._cards.length).toBe(2);
  // removing player1 fine card so they will have only 1 card
  player1._cards.splice(player1._cards.indexOf('♥9'), 1);
  room.play('♦2'); // player1 plays
  expect(room._currentTurn).toBe(0);
  expect(room._eventemitter.lastSignal).toBe('game-finished');
  expect(room.gameFinished).toBe(true);
  expect(player1.rank).toBe(2);
  expect(player2.rank).toBe(3);
  expect(player3.rank).toBe(1);
});