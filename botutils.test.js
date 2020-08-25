const utils = require('./src/utils');
const RoomManager = require('./src/botutils').RoomManager;

const roomManager = new RoomManager();
const creatorChatId = 10;
const creatorPlayer = new utils.Player('Creator', creatorChatId, 100);
const player1 = new utils.Player('Player 1', 20, 200);
const player2 = new utils.Player('Player 2', 30, 300);
let roomInfo;
let roomObj;

test('RoomManager: new-room-created event', (done) => {
    roomManager.on('new-room-created', (name, creatorChatId, creatorMessageId) => {
        expect(name).toBe('Main room');
        expect(creatorChatId).toBe(creatorPlayer.chatId);
        expect(creatorMessageId).toBe(100);
        done();
    });
    roomManager.createRoom(creatorPlayer, 'Main room');
    roomInfo = roomManager._rooms[creatorChatId];
    roomObj = roomInfo.roomObj;
});

test('RoomManager: createRoom()', () => {
    expect(roomManager.getRoomByCreatorChatId(10)).toBe(roomInfo);
    expect(roomInfo.name).toBe('Main room');
});

test('RoomManager: adding new players', (done) => {
    roomManager.once('room-status-changed', () => {
        expect(roomInfo.messageInfo[player1.chatId]).toBe(player1.messageId);
        done();
    });
    roomObj.addPlayer(player1);
    roomObj.addPlayer(player2);
});

test('RoomManager: changing players\' ready state', (done) => {
    roomManager.once('room-status-changed', () => {
        done();
    });
    creatorPlayer.ready = true;
    player1.ready = true;
    player2.ready = true;
});

test('RoomManager: starting game', (done) => {
    roomManager.once('game-started', (_roomObj) => {
        expect(_roomObj).toBe(roomObj);
        done();
    });
    roomObj.startGame();
});

test('RoomManager: player-to-fine event', (done) => {
    // Rebuilding the deck, the harsh way!
    creatorPlayer._cards = [
        '♦2',
        '♥8'
    ];
    player1._cards = [
        '♦8'
    ];
    player2._cards = [
        '♥6'
    ];
    roomObj._deck = new utils.CardDeck();
    roomObj._deck._topCard = '♦5';
    for (let card of creatorPlayer._cards){
        let index = roomObj._deck._cards.indexOf(card);
        roomObj._deck._cards.splice(index, 1);
    }
    for (let card of player1._cards){
        let index = roomObj._deck._cards.indexOf(card);
        roomObj._deck._cards.splice(index, 1);
    }
    for (let card of player2._cards){
        let index = roomObj._deck._cards.indexOf(card);
        roomObj._deck._cards.splice(index, 1);
    }
    roomManager.once('player-to-fine', (_roomObj, finerPlayer) => {
    expect(_roomObj).toBe(roomObj);
    expect(finerPlayer).toBe(creatorPlayer);
        done();
    });
    roomObj.play('♦2') // Creator plays. player-to-fine should fire.
});

test('RoomManager: turn-changed event', (done) => {
    roomManager.once('turn-changed', (_roomObj) => {
        expect(_roomObj).toBe(roomObj);
        done();
    });
    roomObj.play('♦2', player1); // Creator plays. turn-changed should fire
});

test('RoomManager: game-finished event', (done) => {
    roomManager.once('game-finished', (_roomObj) => {
        expect(_roomObj).toBe(roomObj);
        done();
    });
    roomObj.play('♦8'); // Player 1 plays
    roomObj.play('♥8'); // Player 1 plays. Game finishes.
});