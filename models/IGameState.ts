import { ICard } from './ICard'
import { IPlayer, IPlayerDTO } from './IPlayer'

export interface IGameState {
  players: IPlayer[]
  tableCards: ICard[]
  bettingRoundNum: number
  maxBetCurrentRound: number
  currentPlayer?: IPlayer
  potAmount: number
}

export interface IGameStateDTO {
  players: IPlayerDTO[]
  tableCards: ICard[]
  bettingRoundNum: number
  maxBetCurrentRound: number
  currentPlayer?: IPlayerDTO
  potAmount: number
}
