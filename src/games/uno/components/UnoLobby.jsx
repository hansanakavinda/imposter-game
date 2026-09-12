import React, { useState } from 'react'
import { Play, Users, Bot, BookOpen } from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import Screen, { ScreenHeader, BackLink } from '../../../components/ui/Screen'
import Surface from '../../../components/ui/Surface'
import Button from '../../../components/ui/Button'
import Choice from '../../../components/ui/Choice'
import Label from '../../../components/ui/Label'
import Pill from '../../../components/ui/Pill'
import TextInput from '../../../components/ui/TextInput'
import Toggle from '../../../components/ui/Toggle'
import { Avatar } from '../../../components/ui/PlayerRow'

const BOT_PRESETS = [
  { name: 'Gizmo', avatar: '🤖' },
  { name: 'Blaze', avatar: '🦊' },
  { name: 'Echo', avatar: '🐼' },
]

const TABLE_SHAPE = { 1: 'Head to head', 2: 'Three up', 3: 'Full table' }

export default function UnoLobby({ onStartGame, onBackToMenu, onOpenRules }) {
  const [playerName, setPlayerName] = useState('Player 1')
  const [botCount, setBotCount] = useState(3) // 3 bots = 4 total players (standard Uno)
  const [enableStacking, setEnableStacking] = useState(true)

  const handleStart = (e) => {
    e.preventDefault()
    playClickSound()

    const humanPlayer = {
      id: 0,
      name: playerName.trim() || 'Player 1',
      isHuman: true,
      avatar: '😎',
      hand: [],
    }

    const botPlayers = Array.from({ length: botCount }, (_, i) => ({
      id: i + 1,
      name: BOT_PRESETS[i].name,
      avatar: BOT_PRESETS[i].avatar,
      isHuman: false,
      hand: [],
    }))

    onStartGame({ players: [humanPlayer, ...botPlayers], enableStacking })
  }

  return (
    <Screen>
      {onBackToMenu && (
        <div className="pb-2">
          <BackLink
            onClick={() => {
              playClickSound()
              onBackToMenu()
            }}
          >
            Modes
          </BackLink>
        </div>
      )}

      <ScreenHeader
        eyebrow={<Pill tone="uno">Solo</Pill>}
        title="Play the bots"
        subtitle="Deal yourself in against one to three of them."
        className="pb-6"
      />

      <form onSubmit={handleStart} className="space-y-5">
        <div className="space-y-2">
          <Label as="label" htmlFor="uno-name">
            Your name
          </Label>
          <TextInput
            id="uno-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={15}
            placeholder="What should we call you?"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opponents</Label>
            <span className="font-mono text-nano text-ink-faint">{botCount + 1} at the table</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((count) => (
              <Choice
                key={count}
                tone="uno"
                radius="object"
                selected={botCount === count}
                onClick={() => {
                  playClickSound()
                  setBotCount(count)
                }}
                className="flex-col gap-0.5 py-3"
              >
                <span className="flex items-center gap-1 text-sm font-bold">
                  <Bot className="w-4 h-4" />
                  {count}
                </span>
                <span className="text-nano opacity-70">{TABLE_SHAPE[count]}</span>
              </Choice>
            ))}
          </div>
        </div>

        <Surface radius="object" className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar size="sm">🔥</Avatar>
            <div className="min-w-0">
              <div className="text-mini font-bold text-ink leading-tight">Stacking</div>
              <div className="text-nano text-ink-muted">
                Answer a +2 with a +2, or a +4 with a +4
              </div>
            </div>
          </div>

          <Toggle
            checked={enableStacking}
            label="Allow card stacking"
            onChange={() => {
              playClickSound()
              setEnableStacking(!enableStacking)
            }}
          />
        </Surface>

        <Surface inset radius="object" className="p-4 space-y-2.5">
          <Label className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            At the table
          </Label>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-well bg-felt border border-edge shadow-lift-1 flex items-center gap-2.5">
              <span className="text-lg">😎</span>
              <div className="min-w-0">
                <div className="text-mini font-bold text-ink leading-tight truncate">
                  {playerName || 'You'}
                </div>
                <span className="text-nano font-semibold text-ok">You</span>
              </div>
            </div>

            {BOT_PRESETS.slice(0, botCount).map((bot) => (
              <div
                key={bot.name}
                className="p-2.5 rounded-well bg-felt border border-edge shadow-lift-1 flex items-center gap-2.5"
              >
                <span className="text-lg">{bot.avatar}</span>
                <div className="min-w-0">
                  <div className="text-mini font-bold text-ink leading-tight truncate">
                    {bot.name}
                  </div>
                  <span className="text-nano font-medium text-ink-faint">Bot</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <div className="space-y-2 pt-2">
          <Button type="submit" tone="uno" fullWidth>
            <Play className="w-4 h-4 fill-current" />
            Deal the cards
          </Button>

          {onOpenRules && (
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => {
                playClickSound()
                onOpenRules()
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              How to play
            </Button>
          )}
        </div>
      </form>
    </Screen>
  )
}
