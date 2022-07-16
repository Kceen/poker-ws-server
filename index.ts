import { WebSocketServer, WebSocket } from 'ws'
import { gameStateToGameStateDTO, playerToPlayerPrivateDTO } from './dto-utils'
import { ICard } from './models/ICard'
import { IGameState, IGameStateDTO } from './models/IGameState'
import { IPlayer } from './models/IPlayer'
import { generateNewDeck, getCard } from './poker-utils'
const Hand = require('pokersolver').Hand

enum GameStatus {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  START_GAME = 'START_GAME',
  ENTER_GAME = 'ENTER_GAME',
  END_GAME = 'END_GAME',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_CARDS = 'PLAYER_CARDS',
  PLAY = 'PLAY',
  UPDATE_GAME_STATE = 'UPDATE_GAME_STATE',
  NOTIFICATION = 'NOTIFICATION',
  WAIT_YOUR_TURN = 'WAIT_YOUR_TURN',
  UPDATE_PLAYER_STATE = 'UPDATE_PLAYER_STATE',
}

enum ActionType {
  CHECK = 'CHECK',
  CALL = 'CALL',
  RAISE = 'RAISE',
  FOLD = 'FOLD',
}

const wss = new WebSocketServer({ port: 7999 })
let gameStatus = GameStatus.WAITING_FOR_PLAYERS
const maxPlayers = 2
let notFoldedPlayers: IPlayer[] = []
let potAmountRaiseCurrentRound = 0

let gameState: IGameState = {
  players: [],
  tableCards: [],
  bettingRoundNum: 1,
  maxBetCurrentRound: 0,
  potAmount: 0,
}

wss.on('connection', (socket) => {
  testEval(
    [
      { number: 14, suit: 'SPADES' },
      { number: 10, suit: 'HEARTS' },
    ],
    [
      { number: 14, suit: 'CLUBS' },
      { number: 10, suit: 'HEARTS' },
      { number: 7, suit: 'DIAMONDS' },
      { number: 7, suit: 'CLUBS' },
      { number: 3, suit: 'SPADES' },
    ]
  )

  socket.on('message', (data) => {
    const msgObj = JSON.parse(data.toString())

    if (msgObj.type === GameStatus.ENTER_GAME) {
      if (gameState.players.length < maxPlayers) {
        gameState.players.push({
          ...msgObj.player,
          socket,
          betAmountSum: 0,
          betAmountCurrentRound: 0,
          checked: false,
          folded: false,
        })

        emitToAll(GameStatus.NOTIFICATION, {
          notification: msgObj.player.name + ' has joined',
        })
      }
      if (gameState.players.length === maxPlayers) {
        gameState.bettingRoundNum = 1
        gameState.maxBetCurrentRound = 0
        gameState.potAmount = 0
        gameState.tableCards = []

        notFoldedPlayers = [...gameState.players]

        generateNewDeck()

        emitToAll(GameStatus.START_GAME)

        gameState.players.forEach((player) => {
          let playerCards = []
          playerCards.push(getCard())
          playerCards.push(getCard())

          player.cards = playerCards
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(
              JSON.stringify({
                type: GameStatus.UPDATE_PLAYER_STATE,
                payload: { playerState: playerToPlayerPrivateDTO(player) },
              })
            )
          }
        })

        const randomPlayerToStart =
          gameState.players[Math.floor(Math.random() * maxPlayers)]
        gameState.currentPlayer = randomPlayerToStart

        const gameStateDTO = gameStateToGameStateDTO(gameState)
        emitToSpecificPlayer(GameStatus.PLAY, gameState.currentPlayer?.socket)
        emitToAll(GameStatus.UPDATE_GAME_STATE, { gameState: gameStateDTO })
      }
    }

    if (msgObj.type === GameStatus.PLAY) {
      const action = msgObj.action

      let currentPlayerIndex = gameState.players.indexOf(
        gameState.currentPlayer!
      )

      // CHECK ------------------------------------------------------------------
      if (action === ActionType.CHECK) {
        gameState.players[currentPlayerIndex].checked = true

        emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket)
        emitToAll(GameStatus.NOTIFICATION, {
          notification: gameState.currentPlayer?.name + ' has checked',
        })
      }

      // FOLD ------------------------------------------------------------------
      if (action === ActionType.FOLD) {
        gameState.players[currentPlayerIndex].folded = true

        const toDeleteIndex = notFoldedPlayers.indexOf(gameState.currentPlayer!)
        notFoldedPlayers.splice(toDeleteIndex, 1)

        emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket)
        emitToAll(GameStatus.NOTIFICATION, {
          notification: gameState.currentPlayer?.name + ' has folded',
        })
      }

      // RAISE ------------------------------------------------------------------
      if (action === ActionType.RAISE) {
        let amount = msgObj.amount
        let call =
          gameState.maxBetCurrentRound -
          gameState.players[currentPlayerIndex].betAmountCurrentRound
        let overall = call + amount

        gameState.players[currentPlayerIndex].betAmountCurrentRound += overall
        gameState.players[currentPlayerIndex].betAmountSum += overall
        gameState.players[currentPlayerIndex].money -= overall
        potAmountRaiseCurrentRound += overall

        gameState.maxBetCurrentRound += amount

        emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket)
        emitToAll(GameStatus.NOTIFICATION, {
          notification: gameState.currentPlayer?.name + ' has raised ' + amount,
        })
      }

      // CALL ------------------------------------------------------------------
      if (action === ActionType.CALL) {
        const amountCalled =
          gameState.maxBetCurrentRound -
          gameState.players[currentPlayerIndex].betAmountCurrentRound

        gameState.players[currentPlayerIndex].betAmountCurrentRound =
          gameState.maxBetCurrentRound
        gameState.players[currentPlayerIndex].betAmountSum += amountCalled
        gameState.players[currentPlayerIndex].money -= amountCalled
        potAmountRaiseCurrentRound += amountCalled

        emitToSpecificPlayer(GameStatus.WAIT_YOUR_TURN, socket)
        emitToAll(GameStatus.NOTIFICATION, {
          notification:
            gameState.currentPlayer?.name + ' has called ' + amountCalled,
        })
      }

      let nextPlayer = pickNextPlayer(currentPlayerIndex)
      gameState.currentPlayer = nextPlayer

      const nextRound = goToNextRound()

      let gameStateDTO = gameStateToGameStateDTO(gameState)
      if (nextRound) {
        gameState.bettingRoundNum++
        gameState.maxBetCurrentRound = 0
        gameState.potAmount += potAmountRaiseCurrentRound
        potAmountRaiseCurrentRound = 0
        gameState.players.forEach((player) => {
          player.checked = false
          player.betAmountCurrentRound = 0
        })

        if (gameState.bettingRoundNum === 2) {
          gameState.tableCards.push(getCard())
          gameState.tableCards.push(getCard())
          gameState.tableCards.push(getCard())
        } else if (gameState.bettingRoundNum === 3) {
          gameState.tableCards.push(getCard())
        } else if (gameState.bettingRoundNum === 4) {
          gameState.tableCards.push(getCard())
        }

        gameStateDTO = gameStateToGameStateDTO(gameState)
      }

      emitToSpecificPlayer(GameStatus.PLAY, gameState.currentPlayer!.socket)

      gameState.players.forEach((player) => {
        player.socket.send(
          JSON.stringify({
            type: GameStatus.UPDATE_PLAYER_STATE,
            payload: { playerState: playerToPlayerPrivateDTO(player) },
          })
        )
      })

      emitToAll(GameStatus.UPDATE_GAME_STATE, { gameState: gameStateDTO })

      if (notFoldedPlayers.length < 2) {
        emitToAll(GameStatus.END_GAME)
        return
      }
      if (gameState.bettingRoundNum === 5) {
        let allHands: any[] = []
        notFoldedPlayers.forEach((player) => {
          allHands.push(
            Hand.solve([
              testConverter(player.cards![0]),
              testConverter(player.cards![1]),
              testConverter(gameState.tableCards[0]),
              testConverter(gameState.tableCards[1]),
              testConverter(gameState.tableCards[2]),
              testConverter(gameState.tableCards[3]),
              testConverter(gameState.tableCards[4]),
            ])
          )
        })

        let winner = Hand.winners(allHands)
        // console.log(winner)
        // console.log(allHands[0].name)
        // console.log(allHands[1].name)

        emitToAll(GameStatus.END_GAME)
      }
    }
  })

  socket.on('close', () => {
    const playerWhoLeft = gameState.players.find(
      (player) => player.socket === socket
    )
    if (playerWhoLeft) {
      gameState.players = gameState.players.filter(
        (player) => player.socket !== socket
      )

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: GameStatus.PLAYER_LEFT,
              player: playerWhoLeft.name,
            })
          )
        }
        if (gameState.players.length < 2) {
          client.send(JSON.stringify({ type: GameStatus.END_GAME }))
          gameStatus = GameStatus.WAITING_FOR_PLAYERS
        }
      })
    }
  })
})

const emitToAll = (type: GameStatus, payload?: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: type,
          payload: payload,
        })
      )
    }
  })
}

const emitToPlayers = (type: GameStatus, payload: any) => {
  gameState.players.forEach((player) => {
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(
        JSON.stringify({
          type: type,
          payload: payload,
        })
      )
    }
  })
}

const emitToSpecificPlayer = (
  type: GameStatus,
  playerToSendTo: WebSocket,
  payload?: any
) => {
  gameState.players.forEach((player) => {
    if (
      player.socket.readyState === WebSocket.OPEN &&
      player.socket === playerToSendTo
    ) {
      player.socket.send(
        JSON.stringify({
          type: type,
          payload: payload,
        })
      )
    }
  })
}

const goToNextRound = (): boolean => {
  let notFoldedPlayers = []
  for (const player of gameState.players) {
    if (!player.folded) {
      notFoldedPlayers.push(player)
    }
  }

  let numOfChecked = 0
  for (const player of gameState.players) {
    if (player.checked) {
      numOfChecked++
    }
  }
  if (numOfChecked === notFoldedPlayers.length) {
    return true
  }

  let numOfGoodBets = 0
  for (const player of gameState.players) {
    if (
      player.betAmountCurrentRound === gameState.maxBetCurrentRound &&
      gameState.maxBetCurrentRound !== 0
    ) {
      numOfGoodBets++
    }
  }
  if (numOfGoodBets === notFoldedPlayers.length) {
    return true
  }

  return false
}

const pickNextPlayer = (currentPlayerIndex: number) => {
  let nextPlayer: IPlayer
  while (true) {
    if (currentPlayerIndex === gameState.players.length - 1) {
      if (!gameState.players[0].folded) {
        nextPlayer = gameState.players[0]
        break
      } else {
        currentPlayerIndex = 0
      }
    } else {
      if (!gameState.players[currentPlayerIndex + 1].folded) {
        nextPlayer = gameState.players[currentPlayerIndex + 1]
        break
      } else {
        currentPlayerIndex++
      }
    }
  }

  return nextPlayer
}

const testConverter = (card: ICard) => {
  let cardConverted = ''
  if (card.number === 10) {
    cardConverted += 'T'
  } else if (card.number === 11) {
    cardConverted += 'J'
  } else if (card.number === 12) {
    cardConverted += 'Q'
  } else if (card.number === 13) {
    cardConverted += 'K'
  } else if (card.number === 14) {
    cardConverted += 'A'
  } else {
    cardConverted += card.number
  }

  if (card.suit === 'CLUBS') {
    cardConverted += 'c'
  } else if (card.suit === 'DIAMONDS') {
    cardConverted += 'd'
  } else if (card.suit === 'HEARTS') {
    cardConverted += 'h'
  } else {
    cardConverted += 's'
  }

  return cardConverted
}

const testEval = (playerCards: ICard[], tableCards: ICard[]) => {
  const cards = [...playerCards, ...tableCards]
  cards.sort((c1, c2) => c1.number - c2.number)
  pair(playerCards, tableCards, cards)
}

const pair = (playerCards: ICard[], tableCards: ICard[], cards: ICard[]) => {
  let pairs = []

  for (const card1 of cards) {
    for (const card2 of cards) {
      if (card1 === card2) {
        continue
      }
      if (card1.number === card2.number) {
        pairs.push({ card1, card2 })
      }
    }
  }
  if (pairs.length > 0) {
    if (pairs.length === 2) {
      pairs.splice(1, 1)
    }
    if (pairs.length === 4) {
      pairs.splice(1, 1)
      pairs.splice(2, 1)
    }
    if (pairs.length === 6) {
      pairs.splice(1, 1)
      pairs.splice(2, 1)
      pairs.splice(3, 1)
    }

    const highestPair = pairs.pop()
    if (playerCards.includes(highestPair!.card1 || highestPair!.card2)) {
      console.log('aaa')
    }
  }
}
