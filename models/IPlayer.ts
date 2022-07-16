import { WebSocket } from 'ws'
import { ICard } from './ICard'

export interface IPlayer {
  socket: WebSocket
  name: string
  money: number
  betAmountSum: number
  betAmountCurrentRound: number
  folded?: boolean
  checked?: boolean
  cards?: ICard[]
}

export type IPlayerDTO = Omit<IPlayer, 'cards' | 'socket'>

export type IPlayerPrivateDTO = Omit<IPlayer, 'socket'>
