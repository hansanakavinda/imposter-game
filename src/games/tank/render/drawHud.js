import { TEAMS } from '../constants/tankConstants'

/**
 * Scoreboard and round banner. Screen space -- drawn after the world
 * transform is popped.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawHud(ctx, { canvasWidth, canvasHeight, isPortrait, score, targetScore, roundStatus, roundWinner }) {
  ctx.save()
  const hudCenterX = canvasWidth / 2
  const hudTopY = isPortrait ? 16 : 8

  // Center Top Score Badge
  ctx.fillStyle = 'rgba(9, 9, 11, 0.88)'
  ctx.strokeStyle = '#27272a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(hudCenterX - 105, hudTopY, 210, 36, 12)
  ctx.fill()
  ctx.stroke()

  // Blue Team Score
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = TEAMS.blue.color
  ctx.fillText(`${score.blue}`, hudCenterX - 22, hudTopY + 23)

  // Divider
  ctx.textAlign = 'center'
  ctx.fillStyle = '#71717a'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('VS', hudCenterX, hudTopY + 23)

  // Red Team Score
  ctx.textAlign = 'left'
  ctx.fillStyle = TEAMS.red.color
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText(`${score.red}`, hudCenterX + 22, hudTopY + 23)

  // Target score indicator
  ctx.textAlign = 'center'
  ctx.fillStyle = '#a1a1aa'
  ctx.font = '9px sans-serif'
  ctx.fillText(`FIRST TO ${targetScore}`, hudCenterX, hudTopY + 12)

  // Round Over / Win Overlay
  if (roundStatus === 'round_win' && roundWinner) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.font = 'black 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = roundWinner === 'blue' ? TEAMS.blue.color : TEAMS.red.color
    ctx.fillText(
      `${roundWinner === 'blue' ? 'TEAM BLUE' : 'TEAM RED'} SCORES!`,
      hudCenterX,
      canvasHeight / 2 - 10
    )

    ctx.font = 'bold 14px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Next round in 2 seconds...', hudCenterX, canvasHeight / 2 + 24)
  }

  ctx.restore()
}
