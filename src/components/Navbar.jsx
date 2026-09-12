import React from 'react'
import { Volume2, VolumeX, RotateCcw, HelpCircle, ArrowLeft } from 'lucide-react'
import { getGame } from '../data/games'
import { playClickSound } from '../utils/sound'
import IconButton from './ui/IconButton'
import { FOCUS } from './ui/tokens'

/**
 * The rail the lamp hangs over. Not sticky and not a panel -- it sits flush on
 * the table so the first real object on the page is the one the light hits.
 *
 * Going back to the hub lives here and only here. Screens used to show their
 * own "Games" link alongside this arrow, so every in-game screen had two ways
 * back sitting a few pixels apart.
 */
export default function Navbar({
  soundOn,
  onToggleSound,
  onOpenRules,
  onResetGame,
  inGame,
  activeGame,
  onBackToMenu,
}) {
  const game = getGame(activeGame)

  const handleBack = () => {
    playClickSound()
    if (inGame && !window.confirm('Leave this game? The round will be lost.')) return
    onBackToMenu()
  }

  const handleRestart = () => {
    playClickSound()
    if (window.confirm('Restart this round?')) onResetGame()
  }

  return (
    <header className="relative z-10 w-full max-w-xl mx-auto px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between gap-2 select-none">
      {game ? (
        <button
          type="button"
          onClick={handleBack}
          title="Back to all games"
          className={`group flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-well hover:bg-felt-high transition cursor-pointer ${FOCUS}`}
        >
          <ArrowLeft className="w-4 h-4 text-ink-faint group-hover:text-ink transition" />
          <span className="text-lg leading-none">{game.emoji}</span>
          <span className="font-display text-lg leading-none text-ink">{game.title}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1">
          <span className="font-display text-lg leading-none text-ink">Party Arcade</span>
        </div>
      )}

      <div className="flex items-center gap-0.5">
        {game && inGame && onResetGame && (
          <IconButton label="Restart round" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4" />
          </IconButton>
        )}

        {game && onOpenRules && (
          <IconButton
            label="How to play"
            onClick={() => {
              playClickSound()
              onOpenRules()
            }}
          >
            <HelpCircle className="w-4 h-4" />
          </IconButton>
        )}

        <IconButton label={soundOn ? 'Mute sound' : 'Unmute sound'} onClick={onToggleSound}>
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </IconButton>
      </div>
    </header>
  )
}
