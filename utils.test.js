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
  expect(deck._cards.sort()).toEqual([
      '♦1', '♥1', '♠1', '♣1', '♦2', '♥2', '♠2',
      '♣2', '♦3', '♥3', '♠3', '♣3', '♦4', '♥4',
      '♠4', '♣4', '♦5', '♥5', '♠5', '♣5', '♦6',
      '♥6', '♠6', '♣6', '♦7', '♥7', '♠7', '♣7',
      '♦8', '♥8', '♠8', '♣8', '♦9', '♥9', '♠9',
      '♣9', '♦0', '♥0', '♠0', '♣0', '♦J', '♥J',
      '♠J', '♣J', '♦K', '♥K', '♠K', '♣K', '♦Q',
      '♥Q', '♠Q', '♣Q'
  ].sort());
  deck._randomSeed = 82;
  expect(deck._topCardIndex).toBe(14);
  let copyOfCards = deck._cards.slice();
  let grabbedCard = deck.grabCard();
  expect(deck._isValidCard(grabbedCard)).toBe(true);
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
  expect(deck.getTopCard()).toBe(grabbedCard);
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