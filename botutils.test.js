const utils = require('./src/utils');
const RoomManager = require('./src/botutils').RoomManager;

const roomManager = new RoomManager();
const creatorChatId = 10;
const creatorPlayer = new utils.Player('Creator', creatorChatId, 100);
const player1 = new utils.Player('Player 1', 20, 200);
const player2 = new utils.Player('Player 2', 30, 300);
let roomInfo;
let roomObj;

test('RoomManager: createRoom()', () => {
    roomManager.createRoom(creatorPlayer, 'Main room');
    roomInfo = roomManager._rooms[creatorChatId];
    roomObj = roomInfo.roomObj;
    expect(roomManager.getRoomInfoByCreatorChatId(10)).toBe(roomInfo);
    expect(roomManager.getRoomByPlayerChatId(10)).toBe(roomObj);
    expect(roomInfo.name).toBe('Main room');
});

test('RoomManager: adding new players', (done) => {
    roomManager.once('room-status-changed', (name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        done();
    });
    roomObj.addPlayer(player1);
    roomObj.addPlayer(player2);
});

test('RoomManager: removing players', (done) => {
    roomManager.once('room-status-changed', (name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        done();
    });
    roomObj.removePlayer(player2.chatId);
    roomObj.addPlayer(player2);
});

test('RoomManager: creating room by players that have already joined', () => {
    expect(() => {
        roomManager.createRoom(new utils.Player('Dummy', 10, 100))
    }).toThrow();
    expect(() => {
        roomManager.createRoom(new utils.Player('Dummy', 20, 200))
    }).toThrow();
});

test('RoomManager: getPlayerByChatId()', () => {
    expect(roomManager.getPlayerByChatId(10)).toBe(creatorPlayer);
    expect(roomManager.getPlayerByChatId(20)).toBe(player1);
    expect(roomManager.getPlayerByChatId(999)).toBe(undefined);
});

test('RoomManager: changing players\' ready state', (done) => {
    roomManager.once('room-status-changed', (name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        done();
    });
    creatorPlayer.ready = true;
    player1.ready = true;
    player2.ready = true;
});

test('RoomManager: starting game', (done) => {
    roomManager.once('room-status-changed', (name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        done();
    });
    roomObj.startGame();
});

test('RoomManager: grabbed-card event', (done) => {
    roomManager.once('grabbed-card', (playerChatId, name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        expect(playerChatId).toBe(player1.chatId);
        done();
    });
    roomObj.giveRandomCardToPlayer(player1.chatId);
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
    roomManager.once('player-to-fine', (_roomObj, card, finerPlayer) => {
    expect(_roomObj).toBe(roomObj);
    expect(finerPlayer).toBe(creatorPlayer);
        done();
    });
    roomObj.play('♦2') // Creator plays. player-to-fine should fire.
});

test('RoomManager: changing turns', (done) => {
    roomManager.once('room-status-changed', (name, _roomObj) => {
        expect(_roomObj).toBe(roomObj);
        expect(name).toBe(roomInfo.name);
        done();
    });
    roomObj.play('♦2', player1.chatId); // Creator plays. turn-changed should fire
});

test('RoomManager: game-finished event', (done) => {
    roomManager.once('game-finished', (_roomObj) => {
        expect(_roomObj).toBe(roomObj);
        done();
    });
    roomObj.play('♦8'); // Player 1 plays
    roomObj.play('♥8'); // Player 1 plays. Game finishes.
});