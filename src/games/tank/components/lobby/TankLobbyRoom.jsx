import React from 'react'
import { Check, Play, ArrowLeft, Share2 } from 'lucide-react'
import { MODES, DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import useCopyFeedback from '../../../../hooks/useCopyFeedback'
import { buildRoomLink } from '../../../../services/peerConfig'
import Screen from '../../../../components/ui/Screen'
import Surface from '../../../../components/ui/Surface'
import Button from '../../../../components/ui/Button'
import IconButton from '../../../../components/ui/IconButton'
import CodeDisplay from '../../../../components/ui/CodeDisplay'
import TankSelector from './TankSelector'
import TeamRosterColumn from './TeamRosterColumn'

// The in-room screen: roster, readiness and launch.
export default function TankLobbyRoom({
  mode,
  roomCode,
  isHost,
  players,
  mySlotId,
  myPeerId,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onSelectSlot,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) {
  const currentModeConfig = MODES[mode] || MODES['1v1']
  const { copied, copy } = useCopyFeedback()

  const handleCopyCode = () => {
    playClickSound()
    copy(roomCode)
  }

  // Web Share where it exists -- only Tank offers it -- falling back to copy.
  const handleShareLink = () => {
    playClickSound()
    const url = buildRoomLink('tank', roomCode)
    if (navigator.share) {
      navigator
        .share({
          title: 'Join my Tank Arena game',
          text: `Join my ${currentModeConfig.label} game. Room code: ${roomCode}`,
          url,
        })
        .catch(() => {})
    } else {
      copy(url)
    }
  }

  const myPlayer = players.find(
    (p) => (myPeerId && p.peerId === myPeerId) || p.slotId === mySlotId
  )
  const isMyReady = myPlayer ? !!myPlayer.isReady : false

  const blueSlots = currentModeConfig.slots.filter((s) => s.team === 'blue')
  const redSlots = currentModeConfig.slots.filter((s) => s.team === 'red')

  const totalRequired = currentModeConfig.maxPlayers
  const filledCount = players.length
  const blueCount = players.filter((p) => p.team === 'blue').length
  const redCount = players.filter((p) => p.team === 'red').length
  const hasBothTeams = blueCount >= 1 && redCount >= 1
  const readyCount = players.filter((p) => p.isReady).length
  const allReady = filledCount >= 2 && hasBothTeams && readyCount === filledCount

  const startLabel = () => {
    if (allReady) return 'Start the match'
    if (filledCount < 2) return `Waiting for players (${filledCount}/2)`
    if (!hasBothTeams) return 'Both teams need a player'
    return `Waiting for ready (${readyCount}/${filledCount})`
  }

  return (
    <Screen width="xl" className="items-center">
      <div className="w-full space-y-3">
        <Surface className="p-4 space-y-3">
          <div>
            <h2 className="font-display text-xl leading-none text-ink">
              {currentModeConfig.label} lobby
            </h2>
            <p className="text-mini text-ink-muted">
              {filledCount} of {totalRequired} players connected
            </p>
          </div>

          <div className="flex items-stretch gap-2">
            <CodeDisplay
              code={roomCode}
              tone="tank"
              copied={copied}
              onCopy={handleCopyCode}
              className="flex-1"
            />
            <IconButton
              label="Share a join link"
              onClick={handleShareLink}
              radius="object"
              className="px-3 bg-well border border-edge shadow-sink"
            >
              <Share2 className="w-4 h-4" />
            </IconButton>
          </div>
        </Surface>

        <TankSelector selectedTank={selectedTank} onSelectTank={onSelectTank} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TeamRosterColumn
            team="blue"
            slots={blueSlots}
            players={players}
            mySlotId={mySlotId}
            myPeerId={myPeerId}
            onSelectSlot={onSelectSlot}
          />

          <TeamRosterColumn
            team="red"
            slots={redSlots}
            players={players}
            mySlotId={mySlotId}
            myPeerId={myPeerId}
            onSelectSlot={onSelectSlot}
          />
        </div>

        {(!hasBothTeams || filledCount < 2) && (
          <Surface inset radius="object" className="p-3 text-center space-y-1">
            <p className="text-mini font-bold text-turn">
              {!hasBothTeams && filledCount >= 2
                ? 'Blue and Red each need at least one player.'
                : `Waiting for ${totalRequired - filledCount} more player${
                    totalRequired - filledCount > 1 ? 's' : ''
                  }.`}
            </p>
            <p className="text-micro text-ink-muted">
              Read out <strong className="font-mono font-medium text-tank">{roomCode}</strong>, or
              send a join link.
            </p>
          </Surface>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            variant={isMyReady ? 'primary' : 'secondary'}
            tone="ok"
            className="flex-1"
            onClick={() => {
              playClickSound()
              onToggleReady()
            }}
          >
            <Check className="w-4 h-4" />
            {isMyReady ? "You're ready" : 'Ready up'}
          </Button>

          {isHost ? (
            <Button
              tone="tank"
              className="flex-1"
              disabled={!allReady}
              onClick={() => {
                playClickSound()
                onStartGame()
              }}
            >
              <Play className="w-4 h-4 fill-current" />
              {startLabel()}
            </Button>
          ) : (
            <div className="flex-1 py-3.5 px-4 rounded-object bg-well border border-edge shadow-sink text-center">
              <span className="text-mini font-semibold text-ink-muted">
                {allReady
                  ? 'Waiting for the host to start…'
                  : `Waiting for everyone to ready up (${readyCount}/${filledCount})`}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => {
            playClickSound()
            onLeaveRoom()
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Leave this room
        </Button>
      </div>
    </Screen>
  )
}
