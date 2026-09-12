import React from 'react'
import { Users, Swords, Play } from 'lucide-react'
import { DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import Screen, { ScreenHeader } from '../../../../components/ui/Screen'
import Surface from '../../../../components/ui/Surface'
import Button from '../../../../components/ui/Button'
import Choice from '../../../../components/ui/Choice'
import Label from '../../../../components/ui/Label'
import Pill from '../../../../components/ui/Pill'
import TextInput, { CodeInput } from '../../../../components/ui/TextInput'
import TankSelector from './TankSelector'

// The pre-room screen: call-sign, tank class, battle mode, and create/join.
export default function TankLobbyLanding({
  mode,
  onSelectMode,
  inputCode,
  onChangeInputCode,
  playerName,
  onChangePlayerName,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onCreateRoom,
  onJoinRoom,
  error,
}) {
  const pickMode = (next) => () => {
    playClickSound()
    onSelectMode(next)
  }

  return (
    <Screen width="xl" className="items-center">
      <ScreenHeader
        eyebrow={<Pill tone="tank">Across devices</Pill>}
        title="Tank Arena"
        subtitle="Top-down tank combat. Everyone plays on their own phone."
        className="pb-6"
      />

      <div className="w-full space-y-3">
        <Surface className="p-4 space-y-2.5">
          <Label as="label" htmlFor="tank-call-sign">
            Your call sign
          </Label>
          <TextInput
            id="tank-call-sign"
            type="text"
            value={playerName}
            onChange={(e) => onChangePlayerName(e.target.value.slice(0, 14))}
            placeholder="What should we call you?"
            maxLength={14}
          />
        </Surface>

        <TankSelector selectedTank={selectedTank} onSelectTank={onSelectTank} />

        <Surface className="p-4 space-y-2.5">
          <Label>Battle mode</Label>
          <div className="grid grid-cols-2 gap-2.5">
            <Choice
              tone="team-blue"
              selected={mode === '1v1'}
              onClick={pickMode('1v1')}
              radius="object"
              className="flex-col gap-1 py-3"
            >
              <Swords className="w-5 h-5" />
              <span className="font-bold text-sm">1v1 duel</span>
              <span className="font-mono text-nano opacity-70">2 players</span>
            </Choice>

            <Choice
              tone="team-red"
              selected={mode === '2v2'}
              onClick={pickMode('2v2')}
              radius="object"
              className="flex-col gap-1 py-3"
            >
              <Users className="w-5 h-5" />
              <span className="font-bold text-sm">2v2 squad</span>
              <span className="font-mono text-nano opacity-70">4 players, two teams</span>
            </Choice>
          </div>
        </Surface>

        {error && (
          <p className="px-3 py-2.5 rounded-object bg-danger/10 border border-danger/30 text-danger text-mini text-center font-medium">
            {error}
          </p>
        )}

        <Button
          tone="tank"
          fullWidth
          onClick={() => {
            playClickSound()
            onCreateRoom()
          }}
        >
          <Play className="w-4 h-4 fill-current" />
          Create a room
        </Button>

        <div className="relative flex items-center justify-center py-1">
          <div className="border-t border-edge w-full" />
          <Label className="absolute bg-table px-3">or join a friend</Label>
        </div>

        <div className="flex gap-2">
          <CodeInput
            value={inputCode}
            onChange={(e) => onChangeInputCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE"
            aria-label="Room code"
            className="flex-1 text-xl"
          />
          <Button
            variant="secondary"
            onClick={() => {
              playClickSound()
              onJoinRoom()
            }}
            disabled={inputCode.length < 3}
          >
            Join
          </Button>
        </div>
      </div>
    </Screen>
  )
}
