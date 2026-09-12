import React, { useState } from 'react'
import { Plus, Minus, ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../data/words'
import { playClickSound } from '../../../utils/sound'
import Screen, { ScreenHeader } from '../../../components/ui/Screen'
import Button from '../../../components/ui/Button'
import IconButton from '../../../components/ui/IconButton'
import Choice from '../../../components/ui/Choice'
import Label from '../../../components/ui/Label'
import TextInput from '../../../components/ui/TextInput'
import Pill from '../../../components/ui/Pill'

const TIMERS = [
  { label: 'Off', val: 0 },
  { label: '1m', val: 60 },
  { label: '2m', val: 120 },
  { label: '3m', val: 180 },
]

export default function SetupScreen({ onStartGame }) {
  const [playerCount, setPlayerCount] = useState(4)
  const [imposterCount, setImposterCount] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('any')
  const [timerDuration, setTimerDuration] = useState(0)

  const [customWord, setCustomWord] = useState('')
  const [customHint, setCustomHint] = useState('')
  const [customError, setCustomError] = useState('')

  const handlePlayerChange = (delta) => {
    playClickSound()
    const next = Math.max(3, Math.min(20, playerCount + delta))
    setPlayerCount(next)
    if (next < 5 && imposterCount > 1) {
      setImposterCount(1)
    }
  }

  const pick = (setter, value) => () => {
    playClickSound()
    setter(value)
  }

  const handleStart = (e) => {
    e.preventDefault()
    playClickSound()

    if (selectedCategory === 'custom') {
      if (!customWord.trim()) {
        setCustomError('Enter a secret word')
        return
      }
      if (!customHint.trim()) {
        setCustomError('Enter a single-word hint')
        return
      }
    }

    const defaultNames = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`)

    onStartGame({
      playerCount,
      imposterCount,
      category: selectedCategory,
      timerDuration,
      playerNames: defaultNames,
      customWord: {
        word: customWord.trim(),
        hint: customHint.trim().split(/\s+/)[0], // strictly single word
        categoryName: 'Custom',
        categoryIcon: '✏️',
      },
    })
  }

  return (
    <Screen width="sm">
      <ScreenHeader
        eyebrow={<Pill tone="imposter">Pass &amp; play</Pill>}
        title="New round"
        subtitle="One device, passed around the table."
        className="pb-6"
      />

      <form onSubmit={handleStart} className="space-y-5">
        {/* Players */}
        <div className="space-y-2">
          <Label>Players</Label>
          <div className="flex items-center justify-between gap-3 p-2 rounded-object bg-felt border border-edge shadow-lift-1">
            <IconButton
              label="Fewer players"
              onClick={() => handlePlayerChange(-1)}
              disabled={playerCount <= 3}
              className="w-11 h-11 bg-well shadow-sink disabled:opacity-30"
            >
              <Minus className="w-5 h-5" />
            </IconButton>

            <span className="font-mono text-3xl font-medium text-ink">{playerCount}</span>

            <IconButton
              label="More players"
              onClick={() => handlePlayerChange(1)}
              disabled={playerCount >= 20}
              className="w-11 h-11 bg-well shadow-sink disabled:opacity-30"
            >
              <Plus className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        {/* Imposters */}
        <div className="space-y-2">
          <Label>Imposters</Label>
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={imposterCount === 1} onClick={pick(setImposterCount, 1)}>
              1 imposter
            </Choice>
            <Choice
              selected={imposterCount === 2}
              disabled={playerCount < 5}
              onClick={pick(setImposterCount, 2)}
            >
              2 imposters{playerCount < 5 && ' (5+)'}
            </Choice>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-1.5">
            <Choice selected={selectedCategory === 'any'} onClick={pick(setSelectedCategory, 'any')}>
              🎲 Mixed
            </Choice>

            {CATEGORIES.map((cat) => (
              <Choice
                key={cat.id}
                selected={selectedCategory === cat.id}
                onClick={pick(setSelectedCategory, cat.id)}
              >
                {cat.icon} {cat.name.split(' ')[0]}
              </Choice>
            ))}

            <Choice
              selected={selectedCategory === 'custom'}
              onClick={pick(setSelectedCategory, 'custom')}
            >
              ✏️ Custom
            </Choice>
          </div>

          {selectedCategory === 'custom' && (
            <div className="mt-2 space-y-2 animate-fadeIn">
              <TextInput
                type="text"
                placeholder="Secret word, e.g. Pizza"
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
              />
              <TextInput
                type="text"
                placeholder="Single-word hint, e.g. Italian"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
              />
              {customError && <span className="block text-micro text-danger">{customError}</span>}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="space-y-2">
          <Label>Discussion timer</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {TIMERS.map((t) => (
              <Choice
                key={t.val}
                selected={timerDuration === t.val}
                onClick={pick(setTimerDuration, t.val)}
              >
                {t.label}
              </Choice>
            ))}
          </div>
        </div>

        <div className="pt-3">
          <Button type="submit" tone="imposter" fullWidth>
            Start round <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Screen>
  )
}
