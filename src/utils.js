const EventEmitter = require('events');

class Base {
    constructor(){
        this._cardNumbers = '1234567890JKQ';
        this._cardSuites = '♦♥♠♣';
        this._randomSeed = 82;
    }

    _isValidCard(card){
        if (typeof card === 'string'){
            if (this._cardSuites.includes(card[0]) && this._cardNumbers.includes(card[1])){
                return true;
            }
        }
        return false;
    }

    _random(){
        let randomSine = Math.sin(this._randomSeed++) * 1e4;
        return randomSine - Math.floor(randomSine);
    }
}

class CardDeck extends Base{
    constructor(){
        super();
        this._cards = [];

        // Fill the deck
        for (let suit of this._cardSuites){
            for (let num of this._cardNumbers){
                this._cards.push(suit + num);
            }
        }

        this._topCardIndex = Math.floor(this._random() * this._cards.length);
    }

    grabCard(){
        let randomIndex = Math.floor(this._random() * (this._cards.length - 1));
        if (randomIndex < this._topCardIndex){
            return this._cards.splice(randomIndex, 1)[0];
        }else{
            return this._cards.splice(randomIndex + 1, 1)[0];
        }
    }

    putCard(card){
        if (!this._isValidCard(card)){
            throw 'Invalid card';
        }
        if (this._cards.includes(card)){
            throw 'Card already exists';
        }
        this._cards.push(card);
        this._topCardIndex = this._cards.length - 1;
    }

    getTopCard(){
        return this._cards[this._topCardIndex];
    }
}

class Player extends Base{
    constructor(name, chatId, messageId){
        super();
        this.name = name;
        this.chatId = chatId;
        this.messageId = messageId;
        this._ready = false;
        this.rank = -1; // -1 means this player has not finished playing. otherwise it is the rank of the player.
        this._cards = [];
        this._eventemitter = new EventEmitter();
        this.onReadyChanged = () => {};
        this._eventemitter.on('ready-changed', this.onReadyChanged);
    }

    get cards(){
        return [...this._cards]; // copy of cards
    }

    get ready(){
        return this._ready;
    }

    set ready(state){
        if (!(typeof state == 'boolean')){
            throw 'Ready state should be boolean';
        }
        this._ready = state;
        this._eventemitter.emit('ready-changed', state);
    }

    giveCard(card){
        if (!this._isValidCard(card)){
            throw 'Invalid card';
        }
        if (this._cards.includes(card)){
            throw 'Card already exists';
        }
        this._cards.push(card)
    }

    takeCard(card){
        if (!this._isValidCard(card)){
            throw 'Invalid card';
        }
        if (!this._cards.includes(card)){
            throw 'Card does not exist';
        }
        this._cards.splice(this._cards.indexOf(card), 1)[0];
    }

    takeCardRandom(){
        var randomIndex = Math.floor(this._random() * this._cards.length);
        return this._cards.splice(randomIndex);
    }

    has_no_card(){
        return this._cards.length == 0;
    }
}

class GameRoom extends Base {
    constructor(){
        super();
        this._players = [];
        this._deck = new CardDeck();
        this._currentTurn = 0;
        this.currentPenalty = 0;
        this.flow = 0;
        this._lastRank = 0;
        this._gameStarted = false;
        this._gameFinished = false;

        this._eventemitter = new EventEmitter();
        this.on = this._eventemitter.on;

        this.MIN_PLAYERS = 2;
        this.MAX_PLAYERS = 5;
        this.INITIAL_CARDS = 7;
        this.SEVEN_CARD_PENALTY = 2;
    }

    _checkEveryoneReady(){
        for (let player of this._players){
            if (!player.ready){
                return;
            }
        }
        // Everyone ready!
        this._eventemitter.emit('everyone-ready')
    }

    addPlayer(player){
        if (!player instanceof Player){
            throw 'Invalid player: Not player object';
        }
        this._players.push(player);
        player.onReadyChanged = this._checkEveryoneReady;
    }

    getPlayerByChatId(chatId){
        for (let player of this._players){
            if (player.chatId == chatId){
                return player;
            }
        }
        throw 'Player not found';
    }

    get players(){
        return [...this._players]; // copy of this._players
    }

    get gameStarted(){
        return this._gameStarted;
    }

    get gameFinished(){
        return this._gameFinished;
    }

    get topCard(){
        return this._deck.getTopCard();
    }

    isJoined(chatId){
        for (let player in this._players){
            if (player.chatId == chatId){
                return true;
            }
        }

        return false;
    }

    startGame(){
        // check if we have appropriate number of players
        if (this._players.length < this.MIN_PLAYERS){
            throw 'Too few players';
        }
        if (this._players.length > this.MAX_PLAYERS){
            throw 'Too many players';
        }

        this._gameStarted = true;

        for (let player of this._players){
            for (let i = 0; i < this.INITIAL_CARDS; i++){
                player.giveCard(this._deck.grabCard());
            }
        }

        this._eventemitter.emit('game-started', this.players);
    }

    _isCompatible(card){
        return (typeof card === 'string' &&
            card.length == 2 &&
            card[0] == this.topCard[0] &&
            card[1] == this.topCard[1]
        )
    }

    _updateTurn(hop = false){
        if (hop){
            this._currentTurn = (this._currentTurn + 2 * this.flow) % this._players.length;
        }else{
            this._currentTurn = (this._currentTurn + this.flow) % this._players.length;
        }

        if (this._players[this._currentTurn].rank > 0){
            // This player has finished the round. go for the next
            this._updateTurn(false);
            return;
        }

        this._eventemitter.emit('turn-changed', this.players, this._currentTurn)
    }

    _gameShouldFinish(){
        for (let player of this._players){
            if (player.rank == -1){
                // we have an unfinished player.
                return false;
            }
        }
        // everyone has finished!
        return true;
    }

    play(card, finedPlayer){
        if (!this._isValidCard(card)){
            throw 'Not a valid card';
        }
        if (!this._isCompatible(card)){
            throw 'Not compatible with top card';
        }

        // the card is appropriate.

        var currentTurnPlayer = this._players[this._currentTurn];
        if (!currentTurnPlayer.cards.include(card)){
            throw 'Player doesn\'t have such card';
        }

        var shouldHop = false;

        if (this.currentPenalty > 0){
            if (card[0] != '7'){
                // This player should receive fines!
                for (let i = 0; i < this.currentPenalty; i++){
                    currentTurnPlayer.giveCard(this._deck.grabCard())
                }
                this.currentPenalty = 0;
                this._updateTurn(shouldHop);
            }
        }
        if (card[0] === '0'){
            // reverse game flow
            this.flow *= -1;
        }else if (card[0] == '8'){
            // change the turn to the previous player, so when updating currentTurn, the turn get to this player
            // again.
            this._currentTurn -= this.flow;
        }else if (card[0] == '7'){
            // add to penalty cards; so the first player that doesn't put 7 card gets these penalties!
            this.currentPenalty += this.SEVEN_CARD_PENALTY;
        }else if (card[0] == '2'){
            if (finedPlayer){
                fineCard = currentTurnPlayer.takeCardRandom();
                finedPlayer.giveCard(fineCard);
            }else{
                // a signal should be emitted, indicating that a player should be chosen to be fined.
                this._eventemitter.emit('player-to-fine', currentTurnPlayer);
                return;
            }
        }else if (card[0] == '1'){
            // hop.
            shouldHop = true;
        }

        currentTurnPlayer.takeCard(card);
        this._deck.putCard(card);

        if (currentTurnPlayer.cards.length == 0){
            // give this player the rank he/she deserves!
            this._lastRank += 1;
            currentTurnPlayer.rank = this._lastRank;
            if (this._gameShouldFinish()){
                this._gameFinished = true;
                this._eventemitter.emit('game-finished', this.players);
                return;
            }
        }

        this._updateTurn(shouldHop);
    }

}

module.exports.CardDeck = CardDeck;
module.exports.Player = Player;
module.exports.GameRoom = GameRoom;