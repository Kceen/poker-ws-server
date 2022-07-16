import { shuffle } from 'lodash'
import { ICard } from './models/ICard'

const suits = ['HEARTS', 'CLUBS', 'DIAMONDS', 'SPADES']
let cardsDeck: ICard[]

export const generateNewDeck = () => {
  cardsDeck = []

  for (let i = 2; i < 15; i++) {
    for (let j = 0; j < 4; j++) {
      cardsDeck.push({ number: i, suit: suits[j] })
    }
  }
  cardsDeck = shuffle(cardsDeck)
}

export const getCard = () => {
  return cardsDeck.pop() as ICard
}
