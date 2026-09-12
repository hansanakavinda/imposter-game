import React, { useState } from 'react'
import { Users, Sparkles, AlertTriangle } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'
import Screen, { ScreenHeader, BackLink } from '../../../../components/ui/Screen'
import Surface from '../../../../components/ui/Surface'
import Button from '../../../../components/ui/Button'
import Choice from '../../../../components/ui/Choice'
import Label from '../../../../components/ui/Label'
import Pill from '../../../../components/ui/Pill'
import TextInput, { CodeInput } from '../../../../components/ui/TextInput'
import Toggle from '../../../../components/ui/Toggle'
import { Avatar } from '../../../../components/ui/PlayerRow'
import { FOCUS, cx } from '../../../../components/ui/tokens'

const AVATARS = [
  '😎', '🦊', '🐼', '🐯', '🚀', '⚡', '🌟', '🦄',
  '👑', '🔥', '👾', '🐱', '🐶', '🍕', '🦁', '⭐'
]

/**
 * Before a room exists: pick a name and avatar, then host or join.
 *
 * Owns its own form state -- name, avatar, room code, tab, capacity and the
 * stacking house rule are all read by this screen alone.
 */
export default function UnoJoinCreate({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  onBackToModeSelect,
  roomState,
}) {
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uno_player_name') || 'Player 1'
    }
    return 'Player 1'
  })
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uno_player_avatar') || AVATARS[0]
    }
    return AVATARS[0]
  })
  const [inputRoomCode, setInputRoomCode] = useState(() => {
    if (initialRoomCode) return initialRoomCode
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('uno_last_room') || ''
    }
    return ''
  })
  const [tab, setTab] = useState(() => {
    if (initialRoomCode || (typeof window !== 'undefined' && sessionStorage.getItem('uno_last_room'))) {
      return 'join'
    }
    return 'create'
  })
  const [enableStacking, setEnableStacking] = useState(true)

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    playClickSound()
    const name = playerName.trim() || 'Host'
    try {
      localStorage.setItem('uno_player_name', name)
      localStorage.setItem('uno_player_avatar', selectedAvatar)
    } catch {
      // ignore
    }
    onCreateRoom({ name, avatar: selectedAvatar, maxPlayers, enableStacking })
  }

  const handleJoinSubmit = (e) => {
    e.preventDefault()
    const code = inputRoomCode.trim().toUpperCase()
    if (!code) return
    const name = playerName.trim()
    if (!name) return
    playClickSound()
    try {
      localStorage.setItem('uno_player_name', name)
      localStorage.setItem('uno_player_avatar', selectedAvatar)
      sessionStorage.setItem('uno_last_room', code)
    } catch {
      // ignore
    }
    onJoinRoom({ name, avatar: selectedAvatar, roomCode: code })
  }

  const switchTab = (next) => () => {
    playClickSound()
    setTab(next)
  }

  return (
    <Screen>
      <div className="pb-2">
        <BackLink
          onClick={() => {
            playClickSound()
            onBackToModeSelect()
          }}
        >
          Modes
        </BackLink>
      </div>

      <ScreenHeader
        eyebrow={<Pill tone="uno">Online</Pill>}
        title="Play with friends"
        subtitle="Everyone joins from their own phone."
        className="pb-5"
      />

      {/* Two tabs, because hosting and joining need different fields. */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Choice tone="uno" radius="object" selected={tab === 'create'} onClick={switchTab('create')}>
          Open a room
        </Choice>
        <Choice tone="uno" radius="object" selected={tab === 'join'} onClick={switchTab('join')}>
          Join a room
        </Choice>
      </div>

      {roomState?.error && (
        <p className="mb-4 p-3 rounded-object bg-danger/10 border border-danger/30 text-danger text-mini flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{roomState.error}</span>
        </p>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label as="label" htmlFor="uno-mp-name">
            Your name
          </Label>
          <TextInput
            id="uno-mp-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={12}
            placeholder="What should we call you?"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Your avatar</Label>
          <Surface inset radius="object" className="flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-none">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => {
                  playClickSound()
                  setSelectedAvatar(av)
                }}
                aria-label={`Avatar ${av}`}
                aria-pressed={selectedAvatar === av}
                className={cx(
                  'w-9 h-9 shrink-0 rounded-well flex items-center justify-center text-lg',
                  'transition active:scale-95 cursor-pointer',
                  selectedAvatar === av
                    ? 'bg-felt-high border border-uno shadow-lift-1'
                    : 'hover:bg-felt',
                  FOCUS
                )}
              >
                {av}
              </button>
            ))}
          </Surface>
        </div>

        {tab === 'join' && (
          <div className="space-y-1.5 animate-fadeIn">
            <Label as="label" htmlFor="uno-room-code">
              Room code
            </Label>
            <CodeInput
              id="uno-room-code"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              placeholder="7X49"
            />
          </div>
        )}

        {tab === 'create' && (
          <>
            <Surface radius="object" className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Room size
                </Label>
                <span className="font-mono text-nano text-uno">up to {maxPlayers}</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 sm:gap-1.5">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Choice
                    key={num}
                    tone="uno"
                    selected={maxPlayers === num}
                    onClick={() => {
                      playClickSound()
                      setMaxPlayers(num)
                    }}
                    className="px-0 py-2 font-mono"
                  >
                    {num}
                  </Choice>
                ))}
              </div>

              <div className="flex items-center justify-between text-nano text-ink-faint">
                <span>Two to ten players</span>
                {maxPlayers >= 6 && (
                  <span className="font-semibold text-uno">Six or more deals two decks</span>
                )}
              </div>
            </Surface>

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

            <Surface inset radius="object" className="p-3.5 text-mini text-ink-muted">
              You get a four-letter code and a join link to send round.
            </Surface>
          </>
        )}
      </div>

      <div className="pt-6">
        {tab === 'create' ? (
          <Button
            tone="uno"
            fullWidth
            onClick={handleCreateSubmit}
            disabled={roomState?.isConnecting}
          >
            <Sparkles className="w-4 h-4" />
            {roomState?.isConnecting ? 'Opening the room…' : 'Open the room'}
          </Button>
        ) : (
          <Button
            tone="uno"
            fullWidth
            onClick={handleJoinSubmit}
            disabled={!inputRoomCode.trim() || !playerName.trim() || roomState?.isConnecting}
          >
            <Users className="w-4 h-4" />
            {roomState?.isConnecting ? 'Connecting…' : 'Join the room'}
          </Button>
        )}
      </div>
    </Screen>
  )
}
