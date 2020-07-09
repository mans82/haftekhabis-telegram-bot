class Base {
    constructor(){}

    _isValidCard(card){
        if (typeof card === 'string'){
            if (this._cardSuites.includes(card[0]) && this._cardNumbers.includes(card[1])){
                return true;
            }
        }

        return false;
    }
}

class CardDeck extends Base{
    constructor(){
        this._cards = [];
        this._cardNumbers = '1234567890JKQ';
        this._cardSuites = '♦♥♠♣';

        // Fill the deck
        for (suit in this._cardSuites){
            for (num in this._cardNumbers){
                this._cards.push(suit + num);
            }
        }

        this._topCardIndex = Math.floor(Math.random() * this._cards);
    }

    getCard(){
        randomIndex = Math.floor(Math.random() * (this._cards.length - 1));
        if (randomIndex < this._topCardIndex){
            return this._cards.splice(randomIndex);
        }else{
            return this._cards.splice(randomIndex + 1)
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
        this.name = name;
        this.chatId = chatId;
        this.messageId = messageId;
        this.ready = false;
        this.rank = -1; // -1 means this player has not finished playing. otherwise it is the rank of the player.
        this._cards = [];
    }

    get cards(){
        return [...this._cards]; // copy of cards
    }

    put_card(card){
        if (!this._isValidCard(card)){
            throw 'Invalid card';
        }
        this._cards.push(card)
    }

    take_card(card){
        if (!this._isValidCard(card)){
            throw 'Invalid card';
        }
        if (!this._cards.includes(card)){
            throw 'Card does not exist';
        }
        this._cards.splice(card);
    }

    has_no_card(){
        return this._cards.length == 0;
    }
}