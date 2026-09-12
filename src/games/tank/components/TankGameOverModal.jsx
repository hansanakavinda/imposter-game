import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
import { TEAMS } from '../constants/tankConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'

export default function TankGameOverModal({
  winner, // 'blue' or 'red'
  score,
  isHost,
  onRematch,
  onBackToLobby,
}) {
  const winningTeam = TEAMS[winner] || TEAMS.blue
  const winnerTone = winner === 'red' ? 'team-red' : 'team-blue'

  useEffect(() => {
    playVictorySound()
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [winningTeam.color, '#f0a926', '#f5efe6'],
      })
    } catch {
      // ignore
    }
    // winningTeam is derived from winner via the TEAMS constant, so it is stable and
    // listing winner as well would be redundant.
  }, [winningTeam])

  return (
    <Modal
      open
      dismissible={false}
      size="sm"
      className="text-center"
      footer={
        <div className="space-y-2">
          {isHost ? (
            <Button
              tone={winnerTone}
              fullWidth
              onClick={() => {
                playClickSound()
                onRematch()
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Play again
            </Button>
          ) : (
            <p className="text-mini text-ink-muted">Waiting for the host to start a rematch…</p>
          )}

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => {
              playClickSound()
              onBackToLobby()
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to the lobby
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        <div
          className="w-16 h-16 rounded-object mx-auto flex items-center justify-center shadow-lift-2"
          style={{
            backgroundColor: `${winningTeam.color}25`,
            border: `1.5px solid ${winningTeam.color}60`,
          }}
        >
          <Trophy className="w-8 h-8" style={{ color: winningTeam.color }} />
        </div>

        <div className="space-y-1">
          <Label>Match over</Label>
          <h2 className="font-display text-3xl leading-none" style={{ color: winningTeam.color }}>
            {winningTeam.name} wins
          </h2>
        </div>

        <div className="rounded-object bg-well border border-edge shadow-sink py-3 px-6 flex items-center justify-around">
          <div>
            <Label className="text-team-blue">Blue</Label>
            <span className="font-mono text-2xl font-medium text-team-blue">{score.blue}</span>
          </div>
          <span className="font-mono text-mini text-ink-faint">vs</span>
          <div>
            <Label className="text-team-red">Red</Label>
            <span className="font-mono text-2xl font-medium text-team-red">{score.red}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
