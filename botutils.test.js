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
    roomManager.createRoom(creatorPlayer, 100, 'Main room');
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
