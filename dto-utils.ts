import { IGameState, IGameStateDTO } from './models/IGameState'
import { IPlayer, IPlayerDTO, IPlayerPrivateDTO } from './models/IPlayer'

export const playerToPlayerDTO = (player: IPlayer) => {
  const playerDTO: IPlayerDTO = {
    name: player.name,
    money: player.money,
    betAmountSum: player.betAmountSum,
    betAmountCurrentRound: player.betAmountCurrentRound,
    checked: player.checked,
    folded: player.folded,
  }
  return playerDTO
}

export const playerToPlayerPrivateDTO = (player: IPlayer) => {
  const playerDTO: IPlayerPrivateDTO = {
    name: player.name,
    money: player.money,
    betAmountSum: player.betAmountSum,
    betAmountCurrentRound: player.betAmountCurrentRound,
    checked: player.checked,
    folded: player.folded,
    cards: player.cards,
  }
  return playerDTO
}

export const gameStateToGameStateDTO = (gameState: IGameState) => {
  const playersDTO: IPlayerDTO[] = []
  gameState.players.forEach((player) => {
    playersDTO.push(playerToPlayerDTO(player))
  })

  const gameStateDTO: IGameStateDTO = {
    players: playersDTO,
    tableCards: gameState.tableCards,
    bettingRoundNum: gameState.bettingRoundNum,
    maxBetCurrentRound: gameState.maxBetCurrentRound,
    currentPlayer: playerToPlayerDTO(gameState.currentPlayer!),
    potAmount: gameState.potAmount,
  }

  return gameStateDTO
}
