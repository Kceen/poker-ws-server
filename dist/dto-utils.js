"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameStateToGameStateDTO = exports.playerToPlayerPrivateDTO = exports.playerToPlayerDTO = void 0;
const playerToPlayerDTO = (player) => {
    const playerDTO = {
        name: player.name,
        money: player.money,
        betAmountSum: player.betAmountSum,
        betAmountCurrentRound: player.betAmountCurrentRound,
        checked: player.checked,
        folded: player.folded,
    };
    return playerDTO;
};
exports.playerToPlayerDTO = playerToPlayerDTO;
const playerToPlayerPrivateDTO = (player) => {
    const playerDTO = {
        name: player.name,
        money: player.money,
        betAmountSum: player.betAmountSum,
        betAmountCurrentRound: player.betAmountCurrentRound,
        checked: player.checked,
        folded: player.folded,
        cards: player.cards,
    };
    return playerDTO;
};
exports.playerToPlayerPrivateDTO = playerToPlayerPrivateDTO;
const gameStateToGameStateDTO = (gameState) => {
    const playersDTO = [];
    gameState.players.forEach((player) => {
        playersDTO.push((0, exports.playerToPlayerDTO)(player));
    });
    const gameStateDTO = {
        players: playersDTO,
        tableCards: gameState.tableCards,
        bettingRoundNum: gameState.bettingRoundNum,
        maxBetCurrentRound: gameState.maxBetCurrentRound,
        currentPlayer: (0, exports.playerToPlayerDTO)(gameState.currentPlayer),
        potAmount: gameState.potAmount,
    };
    return gameStateDTO;
};
exports.gameStateToGameStateDTO = gameStateToGameStateDTO;
