const { TestScheduler } = require("jest");

const utils = require('./src/utils');
const RoomManager = require('./src/botutils').RoomManager;

test('Test RoomManager', () => {
    let mockEmitter = {
        lastSignal : '',
        on() {return},
        emit(singal, callback) {this.lastSignal = singal}
    };
    const roomManager = new RoomManager();
    roomManager._eventemitter = {...mockEmitter}; // a copy of mockEmitter
    const creatorChatId = 10;
    const creatorPlayer = new utils.Player('Creator', creatorChatId, 100);
    const Player1 = new utils.Player('Player 1', 20, 200);
    const Player2 = new utils.Player('Player 2', 30, 300);
    roomManager.createRoom(creatorPlayer, 100, 'Main room');
    expect(roomManager._rooms[creatorChatId].name).toBe('Main room');
    expect(roomManager._eventemitter.lastSignal).toBe('room-created');
})