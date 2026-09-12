import React, { useState } from 'react'
import {
  RotateCw,
  BookOpen,
  Users,
  LogOut,
  Play,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import useCopyFeedback from '../../../hooks/useCopyFeedback'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import CodeDisplay from '../../../components/ui/CodeDisplay'
import Label from '../../../components/ui/Label'
import Surface from '../../../components/ui/Surface'
import { Badge } from '../../../components/ui/PlayerRow'
import { FOCUS, cx } from '../../../components/ui/tokens'

/** One row of the in-game menu. There were four, written out four times. */
function MenuRow({ icon, title, body, tone = 'neutral', onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'w-full p-2.5 rounded-object border text-left flex items-center gap-2.5 transition cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        tone === 'danger'
          ? 'bg-danger/5 border-danger/25 hover:bg-danger/10'
          : 'bg-felt border-edge hover:bg-felt-high shadow-lift-1',
        FOCUS
      )}
    >
      <span
        className={cx(
          'w-7 h-7 rounded-well flex items-center justify-center shrink-0',
          tone === 'danger'
            ? 'bg-danger/10 border border-danger/30 text-danger'
            : 'bg-well shadow-sink text-ink-muted'
        )}
      >
        {icon}
      </span>
      <span className="block min-w-0">
        <span
          className={cx(
            'block text-mini font-bold',
            tone === 'danger' ? 'text-danger' : 'text-ink'
          )}
        >
          {title}
        </span>
        <span className="block text-nano text-ink-muted">{body}</span>
      </span>
    </button>
  )
}

export default function UnoSettingsModal({
  isOpen,
  onClose,
  isMultiplayer = false,
  isHost = false,
  roomCode = '',
  onSyncState,
  onOpenRules,
  onReturnToLobby,
  onLeaveGame,
  connectionStatus = 'connected',
  onReconnect,
}) {
  const [confirmAction, setConfirmAction] = useState(null) // null | 'lobby' | 'exit'
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState('')

  // Was a bare setTimeout that outlived the modal; this is the shared hook that
  // exists precisely because both lobbies had the same leak.
  const { copied, copy } = useCopyFeedback()

  const handleClose = () => {
    playClickSound()
    setConfirmAction(null)
    setSyncFeedback('')
    onClose()
  }

  const handleTriggerSync = () => {
    playClickSound()
    if (!onSyncState || isSyncing) return
    setIsSyncing(true)
    setSyncFeedback('Asking the host…')
    onSyncState()
    setTimeout(() => {
      setIsSyncing(false)
      setSyncFeedback('Up to date')
      setTimeout(() => setSyncFeedback(''), 2500)
    }, 600)
  }

  const handleConfirmLobby = () => {
    playClickSound()
    setConfirmAction(null)
    onReturnToLobby()
    onClose()
  }

  const handleConfirmExit = () => {
    playClickSound()
    setConfirmAction(null)
    onLeaveGame()
    onClose()
  }

  const connection = () => {
    if (isHost) return { tone: 'ok', icon: <Wifi className="w-3 h-3" />, label: 'Hosting' }
    if (connectionStatus === 'connected') {
      return { tone: 'ok', icon: <Wifi className="w-3 h-3" />, label: 'Connected' }
    }
    if (connectionStatus === 'reconnecting') {
      return { tone: 'turn', icon: <WifiOff className="w-3 h-3" />, label: 'Reconnecting' }
    }
    return { tone: 'danger', icon: <WifiOff className="w-3 h-3" />, label: 'Disconnected' }
  }

  if (confirmAction) {
    const toLobby = confirmAction === 'lobby'
    const title = toLobby
      ? isHost && isMultiplayer
        ? 'Send everyone back to the lobby?'
        : 'Back to the lobby?'
      : 'Leave this match?'
    const body = toLobby
      ? isHost && isMultiplayer
        ? 'The round ends and everyone returns to the lobby. The room code stays the same.'
        : 'You leave this round and go back to the waiting lobby.'
      : isHost && isMultiplayer
      ? 'Leaving as host closes the room and disconnects everyone.'
      : 'This round is lost and you go back to the menu.'

    return (
      <Modal
        open={isOpen}
        onClose={() => setConfirmAction(null)}
        title={title}
        size="sm"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Keep playing
            </Button>
            <Button
              tone={toLobby ? 'uno' : 'danger'}
              onClick={toLobby ? handleConfirmLobby : handleConfirmExit}
            >
              {toLobby ? 'To the lobby' : 'Leave'}
            </Button>
          </div>
        }
      >
        <p className="flex items-start gap-2.5 p-3 rounded-object bg-turn/10 border border-turn/30 text-mini text-ink-muted">
          <AlertTriangle className="w-4 h-4 text-turn shrink-0 mt-0.5" />
          {body}
        </p>
      </Modal>
    )
  }

  const status = connection()

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Game menu"
      size="sm"
      footer={
        <Button fullWidth onClick={handleClose}>
          <Play className="w-3.5 h-3.5 fill-current" />
          Back to the game
        </Button>
      }
      bodyClassName="space-y-3"
    >
      {isMultiplayer ? (
        <div className="space-y-2">
          <CodeDisplay
            code={roomCode || '----'}
            tone="uno"
            copied={copied}
            onCopy={() => roomCode && copy(roomCode)}
          />
          <div className="flex justify-end">
            <Badge tone={status.tone}>
              {status.icon}
              {status.label}
            </Badge>
          </div>
        </div>
      ) : (
        <Surface inset radius="object" className="p-3 flex items-center justify-between">
          <div>
            <Label>Solo</Label>
            <span className="text-mini text-ink-muted">Playing the bots</span>
          </div>
          <span className="text-xl">🤖</span>
        </Surface>
      )}

      {isMultiplayer && !isHost && connectionStatus === 'disconnected' && onReconnect && (
        <Button
          tone="danger"
          size="md"
          fullWidth
          onClick={() => {
            playClickSound()
            onReconnect()
          }}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Reconnect to the host
        </Button>
      )}

      <div className="space-y-1.5">
        {isMultiplayer && (
          <div>
            <MenuRow
              icon={<RotateCw className={cx('w-3.5 h-3.5', isSyncing && 'animate-spin')} />}
              title="Resync with the host"
              body="Pull the turn, the top card and your hand again"
              onClick={handleTriggerSync}
              disabled={isSyncing}
            />
            {syncFeedback && (
              <p className="pt-1 text-center text-nano font-bold text-ok animate-fadeIn">
                {syncFeedback}
              </p>
            )}
          </div>
        )}

        <MenuRow
          icon={<BookOpen className="w-3.5 h-3.5" />}
          title="How to play"
          body="Card powers, penalties and stacking"
          onClick={() => {
            playClickSound()
            onClose()
            if (onOpenRules) onOpenRules()
          }}
        />

        <MenuRow
          icon={<Users className="w-3.5 h-3.5" />}
          title={isMultiplayer && isHost ? 'Send everyone to the lobby' : 'Back to the lobby'}
          body={isMultiplayer ? 'Keeps the room code' : 'Change the bot setup'}
          onClick={() => {
            playClickSound()
            setConfirmAction('lobby')
          }}
        />

        <MenuRow
          tone="danger"
          icon={<LogOut className="w-3.5 h-3.5" />}
          title="Leave the match"
          body="Back to mode select"
          onClick={() => {
            playClickSound()
            setConfirmAction('exit')
          }}
        />
      </div>
    </Modal>
  )
}
