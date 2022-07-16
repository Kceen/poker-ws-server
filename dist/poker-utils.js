"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCard = exports.generateNewDeck = void 0;
const lodash_1 = require("lodash");
const suits = ['HEARTS', 'CLUBS', 'DIAMONDS', 'SPADES'];
let cardsDeck;
const generateNewDeck = () => {
    cardsDeck = [];
    for (let i = 2; i < 15; i++) {
        for (let j = 0; j < 4; j++) {
            cardsDeck.push({ number: i, suit: suits[j] });
        }
    }
    cardsDeck = (0, lodash_1.shuffle)(cardsDeck);
};
exports.generateNewDeck = generateNewDeck;
const getCard = () => {
    return cardsDeck.pop();
};
exports.getCard = getCard;
