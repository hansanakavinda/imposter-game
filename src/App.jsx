import React, { useState } from 'react'
import Navbar from './components/Navbar'
import SetupScreen from './components/SetupScreen'
import PassCardScreen from './components/PassCardScreen'
import DiscussionScreen from './components/DiscussionScreen'
import RevealScreen from './components/RevealScreen'
import RulesModal from './components/RulesModal'
import { getRandomWordPair } from './data/words'
import { assignPlayerThemes, shuffleArray } from './data/cardThemes'
import { isSoundEnabled, setSoundEnabled } from './utils/sound'
import './App.css'

export default function App() {
  // Navigation & Modal State
  const [currentScreen, setCurrentScreen] = useState('setup') // 'setup' | 'pass' | 'discussion' | 'reveal'
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  // Game Configuration State
  const [gameConfig, setGameConfig] = useState({
    playerCount: 4,
    imposterCount: 1,
    category: 'any',
    timerDuration: 0, // Default to Off
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    customWord: null,
  })

  // Active Game Session State
  const [players, setPlayers] = useState([])
  const [gameData, setGameData] = useState({
    word: '',
    hint: '',
    categoryName: '',
    categoryIcon: '',
  })
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(0)

  const handleToggleSound = () => {
    const nextVal = !soundOn
    setSoundOn(nextVal)
    setSoundEnabled(nextVal)
  }

  // Initialize a new game round
  const handleStartGame = (config) => {
    setGameConfig(config)
    initializeRound(config)
  }

  const initializeRound = (config) => {
    const count = config.playerCount
    const impCount = config.imposterCount

    // 1. Pick Secret Word & Single-Word Hint
    let roundWordData
    if (config.category === 'custom' && config.customWord) {
      roundWordData = config.customWord
    } else {
      roundWordData = getRandomWordPair(config.category)
    }

    // 2. Assign unique random color themes to each player
    const assignedThemes = assignPlayerThemes(count)

    // 3. Randomly select imposter(s) without bias
    const indices = Array.from({ length: count }, (_, i) => i)
    const shuffledIndices = shuffleArray(indices)
    const imposterIndices = new Set(shuffledIndices.slice(0, impCount))

    // 4. Assemble player objects
    const assembledPlayers = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: config.playerNames[i] || `Player ${i + 1}`,
      isImposter: imposterIndices.has(i),
      theme: assignedThemes[i],
    }))

    // 5. Randomly choose who speaks first in discussion
    const firstSpeaker = Math.floor(Math.random() * count)

    setGameData(roundWordData)
    setPlayers(assembledPlayers)
    setCurrentPlayerIndex(0)
    setStartingPlayerIndex(firstSpeaker)
    setCurrentScreen('pass')
  }

  const handleNextPlayer = () => {
    setCurrentPlayerIndex((prev) => prev + 1)
  }

  const handleFinishPass = () => {
    setCurrentScreen('discussion')
  }

  const handleRevealImposters = () => {
    setCurrentScreen('reveal')
  }

  const handlePlayAgain = () => {
    initializeRound(gameConfig)
  }

  const handleResetToSetup = () => {
    setCurrentScreen('setup')
    setCurrentPlayerIndex(0)
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-zinc-700 selection:text-white">
      {/* Minimal Top Header */}
      <Navbar
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
        onResetGame={handleResetToSetup}
        inGame={currentScreen !== 'setup'}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2">
        {currentScreen === 'setup' && (
          <SetupScreen onStartGame={handleStartGame} />
        )}

        {currentScreen === 'pass' && (
          <PassCardScreen
            players={players}
            gameData={gameData}
            currentPlayerIndex={currentPlayerIndex}
            onNextPlayer={handleNextPlayer}
            onFinishPass={handleFinishPass}
          />
        )}

        {currentScreen === 'discussion' && (
          <DiscussionScreen
            players={players}
            gameData={gameData}
            timerDuration={gameConfig.timerDuration}
            startingPlayerIndex={startingPlayerIndex}
            onRevealImposters={handleRevealImposters}
          />
        )}

        {currentScreen === 'reveal' && (
          <RevealScreen
            players={players}
            gameData={gameData}
            onPlayAgain={handlePlayAgain}
            onNewSetup={handleResetToSetup}
          />
        )}
      </main>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  )
}
