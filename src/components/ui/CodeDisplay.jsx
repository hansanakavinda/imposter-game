import React from 'react'
import { Check, Copy } from 'lucide-react'
import { TONE_TEXT, cx } from './tokens'
import IconButton from './IconButton'

/**
 * The room code, shown. Both lobbies rendered this and its copy button with
 * their own class strings; the behaviour (useCopyFeedback, buildRoomLink) was
 * already shared, only the presentation was not.
 */
export default function CodeDisplay({
  code,
  tone = 'lamp',
  copied = false,
  onCopy,
  label = 'Room code',
  className = '',
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 px-4 py-3',
        'rounded-object bg-well border border-edge shadow-sink',
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-nano uppercase text-ink-faint font-semibold">{label}</div>
        <div className={cx('font-mono text-2xl font-medium tracking-[0.3em]', TONE_TEXT[tone])}>
          {code}
        </div>
      </div>
      {onCopy && (
        <IconButton
          label={copied ? 'Copied' : 'Copy room code'}
          onClick={onCopy}
          className={copied ? 'text-ok' : ''}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </IconButton>
      )}
    </div>
  )
}
