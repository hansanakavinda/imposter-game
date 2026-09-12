import React from 'react'
import { WifiOff } from 'lucide-react'
import Button from '../../../../components/ui/Button'
import { playClickSound } from '../../../../utils/sound'

/** Shown to a client whose connection dropped mid-match. */
export default function UnoDisconnectBanner({ onReconnect, onOpenMenu }) {
  return (
    <div className="relative z-10 mb-2 p-2.5 rounded-object bg-danger/10 border border-danger/40 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 text-danger shrink-0" />
        <span className="min-w-0">
          <span className="block text-mini font-bold text-danger leading-tight">
            Lost the host
          </span>
          <span className="block text-nano text-ink-muted">Your hand and seat are kept</span>
        </span>
      </span>

      <span className="flex items-center gap-1.5 shrink-0">
        {onReconnect && (
          <Button
            size="sm"
            tone="danger"
            onClick={() => {
              playClickSound()
              onReconnect()
            }}
          >
            Reconnect
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            playClickSound()
            onOpenMenu()
          }}
        >
          Menu
        </Button>
      </span>
    </div>
  )
}
