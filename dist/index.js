"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const dto_utils_1 = require("./dto-utils");
const poker_utils_1 = require("./poker-utils");
const Hand = require('pokersolver').Hand;
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING_FOR_PLAYERS"] = "WAITING_FOR_PLAYERS";
    GameStatus["START_GAME"] = "START_GAME";
    GameStatus["ENTER_GAME"] = "ENTER_GAME";
    GameStatus["END_GAME"] = "END_GAME";
    GameStatus["PLAYER_JOINED"] = "PLAYER_JOINED";
    GameStatus["PLAYER_LEFT"] = "PLAYER_LEFT";
    GameStatus["PLAYER_CARDS"] = "PLAYER_CARDS";
    GameStatus["PLAY"] = "PLAY";
    GameStatus["UPDATE_GAME_STATE"] = "UPDATE_GAME_STATE";
    GameStatus["NOTIFICATION"] = "NOTIFICATION";
    GameStatus["WAIT_YOUR_TURN"] = "WAIT_YOUR_TURN";
    GameStatus["UPDATE_PLAYER_STATE"] = "UPDATE_PLAYER_STATE";
})(GameStatus || (GameStatus = {}));
var ActionType;
(function (ActionType) {
    ActionType["CHECK"] = "CHECK";
    ActionType["CALL"] = "CALL";
    ActionType["RAISE"] = "RAISE";
    ActionType["FOLD"] = "FOLD";
})(ActionType || (ActionType = {}));
const wss = new ws_1.WebSocketServer({ port: 7999 });
let gameStatus = GameStatus.WAITING_FOR_PLAYERS;
const maxPlayers = 2;
let notFoldedPlayers = [];
let potAmountRaiseCurrentRound = 0;
let gameState = {
    players: [],
    tableCards: [],
    bettingRoundNum: 1,
    maxBetCurrentRound: 0,
    potAmount: 0,
};
wss.on('connection', (socket) => {
    testEval([
        { number: 14, suit: 'SPADES' },
        { number: 10, suit: 'HEARTS' },
    ], [
        { number: 14, suit: 'CLUBS' },
        { number: 10, suit: 'HEARTS' },
        { number: 7, suit: 'DIAMONDS' },
        { number: 7, suit: 'CLUBS' },
        { number: 3, suit: 'SPADES' },
    ]);
    socket.on('message', (data) => {
        var _a, _b, _c, _d, _e;
        const msgObj = JSON.parse(data.toString());
        if (msgObj.type === GameStatus.ENTER_GAME) {
            if (gameState.players.length < maxPlayers) {
                gameState.players.push(Object.assign(Object.assign({}, msgObj.player), { socket, betAmountSum: 0, betAmountCurrentRound: 0, checked: false, folded: false }));
                emitToAll(GameStatus.NOTIFICATION, {
                    notification: msgObj.player.name + ' has joined',
                });
            }
            if (gameState.players.length === maxPlayers) {
                gameState.bettingRoundNum = 1;
                gameState.maxBetCurrentRound = 0;
                gameState.potAmount = 0;
                gameState.tableCards = [];
                notFoldedPlayers = [...gameState.players];
                (0, poker_utils_1.generateNewDeck)();
                emitToAll(GameStatus.START_GAME);
                gameState.players.forEach((player) => {
                    let playerCards = [];
                    playerCards.push((0, poker_utils_1.getCard)());
                    playerCards.push((0, poker_utils_1.getCard)());
                    player.cards = playerCards;
                    if (player.socket.readyState === ws_1.WebSocket.OPEN) {
                        player.socket.send(JSON.stringify({
                            type: GameStatus.UPDATE_PLAYER_STATE,
                            payload: { playerState: (0, dto_utils_1.playerToPlayerPrivateDTO)(player) },
                        }));
                    }
                });
                const randomPlayerToStart = gameState.players[Math.floor(Math.random() * maxPlayers)];
                gameState.currentPlayer = randomPlayerToStart;
                const gameStateDTO = (0, dto_utils_1.gameStateToGameStateDTO)(gameState);
                emitToSpecificPlayer(GameStatus.PLAY, (_a = gameState.currentPlayer) === null || _a === void 0 ? void 0 : _a.socket);
                emitToAll(GameStatus.UPDATE_GAME_STATE, { gameState: gameStateDTO });
            }
        }
        if (msgObj.type === GameStatus.PLAY) {
            const action = msgObj.action;
            let currentPlayerIndex = gameState.players.indexOf(gameState.currentPlayer);
            // CHECK ------------------------------------------------------------------
            if (action === ActionType.CHECK) {
                gameState.players[currentPlayerIndex].checked = true;
                emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket);
                emitToAll(GameStatus.NOTIFICATION, {
                    notification: ((_b = gameState.currentPlayer) === null || _b === void 0 ? void 0 : _b.name) + ' has checked',
                });
            }
            // FOLD ------------------------------------------------------------------
            if (action === ActionType.FOLD) {
                gameState.players[currentPlayerIndex].folded = true;
                const toDeleteIndex = notFoldedPlayers.indexOf(gameState.currentPlayer);
                notFoldedPlayers.splice(toDeleteIndex, 1);
                emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket);
                emitToAll(GameStatus.NOTIFICATION, {
                    notification: ((_c = gameState.currentPlayer) === null || _c === void 0 ? void 0 : _c.name) + ' has folded',
                });
            }
            // RAISE ------------------------------------------------------------------
            if (action === ActionType.RAISE) {
                let amount = msgObj.amount;
                let call = gameState.maxBetCurrentRound -
                    gameState.players[currentPlayerIndex].betAmountCurrentRound;
                let overall = call + amount;
                gameState.players[currentPlayerIndex].betAmountCurrentRound += overall;
                gameState.players[currentPlayerIndex].betAmountSum += overall;
                gameState.players[currentPlayerIndex].money -= overall;
                potAmountRaiseCurrentRound += overall;
                gameState.maxBetCurrentRound += amount;
                emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket);
                emitToAll(GameStatus.NOTIFICATION, {
                    notification: ((_d = gameState.currentPlayer) === null || _d === void 0 ? void 0 : _d.name) + ' has raised ' + amount,
                });
            }
            // CALL ------------------------------------------------------------------
            if (action === ActionType.CALL) {
                const amountCalled = gameState.maxBetCurrentRound -
                    gameState.players[currentPlayerIndex].betAmountCurrentRound;
                gameState.players[currentPlayerIndex].betAmountCurrentRound =
                    gameState.maxBetCurrentRound;
                gameState.players[currentPlayerIndex].betAmountSum += amountCalled;
                gameState.players[currentPlayerIndex].money -= amountCalled;
                potAmountRaiseCurrentRound += amountCalled;
                emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket);
                emitToAll(GameStatus.NOTIFICATION, {
                    notification: ((_e = gameState.currentPlayer) === null || _e === void 0 ? void 0 : _e.name) + ' has called ' + amountCalled,
                });
            }
            let nextPlayer = pickNextPlayer(currentPlayerIndex);
            gameState.currentPlayer = nextPlayer;
            const nextRound = goToNextRound();
            let gameStateDTO = (0, dto_utils_1.gameStateToGameStateDTO)(gameState);
            if (nextRound) {
                gameState.bettingRoundNum++;
                gameState.maxBetCurrentRound = 0;
                gameState.potAmount += potAmountRaiseCurrentRound;
                potAmountRaiseCurrentRound = 0;
                gameState.players.forEach((player) => {
                    player.checked = false;
                    player.betAmountCurrentRound = 0;
                });
                if (gameState.bettingRoundNum === 2) {
                    gameState.tableCards.push((0, poker_utils_1.getCard)());
                    gameState.tableCards.push((0, poker_utils_1.getCard)());
                    gameState.tableCards.push((0, poker_utils_1.getCard)());
                }
                else if (gameState.bettingRoundNum === 3) {
                    gameState.tableCards.push((0, poker_utils_1.getCard)());
                }
                else if (gameState.bettingRoundNum === 4) {
                    gameState.tableCards.push((0, poker_utils_1.getCard)());
                }
                gameStateDTO = (0, dto_utils_1.gameStateToGameStateDTO)(gameState);
            }
            emitToSpecificPlayer(GameStatus.PLAY, gameState.currentPlayer.socket);
            gameState.players.forEach((player) => {
                player.socket.send(JSON.stringify({
                    type: GameStatus.UPDATE_PLAYER_STATE,
                    payload: { playerState: (0, dto_utils_1.playerToPlayerPrivateDTO)(player) },
                }));
            });
            emitToAll(GameStatus.UPDATE_GAME_STATE, { gameState: gameStateDTO });
            if (notFoldedPlayers.length < 2) {
                emitToAll(GameStatus.END_GAME);
                return;
            }
            if (gameState.bettingRoundNum === 5) {
                let allHands = [];
                notFoldedPlayers.forEach((player) => {
                    allHands.push(Hand.solve([
                        testConverter(player.cards[0]),
                        testConverter(player.cards[1]),
                        testConverter(gameState.tableCards[0]),
                        testConverter(gameState.tableCards[1]),
                        testConverter(gameState.tableCards[2]),
                        testConverter(gameState.tableCards[3]),
                        testConverter(gameState.tableCards[4]),
                    ]));
                });
                let winner = Hand.winners(allHands);
                // console.log(winner)
                // console.log(allHands[0].name)
                // console.log(allHands[1].name)
                emitToAll(GameStatus.END_GAME);
            }
        }
    });
    socket.on('close', () => {
        const playerWhoLeft = gameState.players.find((player) => player.socket === socket);
        if (playerWhoLeft) {
            gameState.players = gameState.players.filter((player) => player.socket !== socket);
            wss.clients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: GameStatus.PLAYER_LEFT,
                        player: playerWhoLeft.name,
                    }));
                }
                if (gameState.players.length < 2) {
                    client.send(JSON.stringify({ type: GameStatus.END_GAME }));
                    gameStatus = GameStatus.WAITING_FOR_PLAYERS;
                }
            });
        }
    });
});
const emitToAll = (type, payload) => {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: type,
                payload: payload,
            }));
        }
    });
};
const emitToPlayers = (type, payload) => {
    gameState.players.forEach((player) => {
        if (player.socket.readyState === ws_1.WebSocket.OPEN) {
            player.socket.send(JSON.stringify({
                type: type,
                payload: payload,
            }));
        }
    });
};
const emitToSpecificPlayer = (type, playerToSendTo, payload) => {
    gameState.players.forEach((player) => {
        if (player.socket.readyState === ws_1.WebSocket.OPEN &&
            player.socket === playerToSendTo) {
            player.socket.send(JSON.stringify({
                type: type,
                payload: payload,
            }));
        }
    });
};
const goToNextRound = () => {
    let notFoldedPlayers = [];
    for (const player of gameState.players) {
        if (!player.folded) {
            notFoldedPlayers.push(player);
        }
    }
    let numOfChecked = 0;
    for (const player of gameState.players) {
        if (player.checked) {
            numOfChecked++;
        }
    }
    if (numOfChecked === notFoldedPlayers.length) {
        return true;
    }
    let numOfGoodBets = 0;
    for (const player of gameState.players) {
        if (player.betAmountCurrentRound === gameState.maxBetCurrentRound &&
            gameState.maxBetCurrentRound !== 0) {
            numOfGoodBets++;
        }
    }
    if (numOfGoodBets === notFoldedPlayers.length) {
        return true;
    }
    return false;
};
const pickNextPlayer = (currentPlayerIndex) => {
    let nextPlayer;
    while (true) {
        if (currentPlayerIndex === gameState.players.length - 1) {
            if (!gameState.players[0].folded) {
                nextPlayer = gameState.players[0];
                break;
            }
            else {
                currentPlayerIndex = 0;
            }
        }
        else {
            if (!gameState.players[currentPlayerIndex + 1].folded) {
                nextPlayer = gameState.players[currentPlayerIndex + 1];
                break;
            }
            else {
                currentPlayerIndex++;
            }
        }
    }
    return nextPlayer;
};
const testConverter = (card) => {
    let cardConverted = '';
    if (card.number === 10) {
        cardConverted += 'T';
    }
    else if (card.number === 11) {
        cardConverted += 'J';
    }
    else if (card.number === 12) {
        cardConverted += 'Q';
    }
    else if (card.number === 13) {
        cardConverted += 'K';
    }
    else if (card.number === 14) {
        cardConverted += 'A';
    }
    else {
        cardConverted += card.number;
    }
    if (card.suit === 'CLUBS') {
        cardConverted += 'c';
    }
    else if (card.suit === 'DIAMONDS') {
        cardConverted += 'd';
    }
    else if (card.suit === 'HEARTS') {
        cardConverted += 'h';
    }
    else {
        cardConverted += 's';
    }
    return cardConverted;
};
const testEval = (playerCards, tableCards) => {
    const cards = [...playerCards, ...tableCards];
    cards.sort((c1, c2) => c1.number - c2.number);
    pair(playerCards, tableCards, cards);
};
const pair = (playerCards, tableCards, cards) => {
    let pairs = [];
    for (const card1 of cards) {
        for (const card2 of cards) {
            if (card1 === card2) {
                continue;
            }
            if (card1.number === card2.number) {
                pairs.push({ card1, card2 });
            }
        }
    }
    if (pairs.length > 0) {
        if (pairs.length === 2) {
            pairs.splice(1, 1);
        }
        if (pairs.length === 4) {
            pairs.splice(1, 1);
            pairs.splice(2, 1);
        }
        if (pairs.length === 6) {
            pairs.splice(1, 1);
            pairs.splice(2, 1);
            pairs.splice(3, 1);
        }
        const highestPair = pairs.pop();
        if (playerCards.includes(highestPair.card1 || highestPair.card2)) {
            console.log('aaa');
        }
    }
};
