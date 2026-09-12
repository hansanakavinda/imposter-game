/**
 * Who is still in the match, and who acts next.
 *
 * This is PRESENTATION order, not the host's rules -- the engine owns the real
 * turn advance in hostEngine.advanceTurn. UnoBoard needs the same answer to
 * draw the TURN and NEXT badges, and used to compute it inline.
 *
 * It lived in the component as a closure redefined on every render, which is
 * why both memos that depend on it carried an eslint-disable: the rule could
 * see the dependency but the value was never stable. As plain functions over
 * (players, rankings) the memos can list what they actually use.
 */

/**
 * A player is finished once they have a rank, or appear in rankings, or have
 * emptied their hand in a match where placements have started.
 */
export function isFinishedPlayer(player, rankings = []) {
  if (!player) return false
  const cardsLeft = player.hand ? player.hand.length : player.cardCount
  return Boolean(
    player.rank ||
      rankings.some((r) => r.playerId === player.id) ||
      (cardsLeft === 0 && (player.rank || rankings.length > 0))
  )
}

export function getActivePlayers(players, rankings = []) {
  return players.filter((p) => !isFinishedPlayer(p, rankings))
}

/**
 * The next seat that can still act, walking in `direction` and skipping anyone
 * who has finished. Falls back to a plain one-step hop when everyone else is
 * out, so it always returns a valid index.
 */
export function findNextPlayerIndex(players, currentPlayerIndex, direction, rankings = []) {
  if (players.length === 0) return 0

  const active = getActivePlayers(players, rankings)
  if (active.length <= 1) return currentPlayerIndex

  // The + players.length * 100 keeps the modulo positive when direction is -1.
  let curr = currentPlayerIndex
  for (let i = 0; i < players.length; i++) {
    curr = (curr + direction + players.length * 100) % players.length
    if (!isFinishedPlayer(players[curr], rankings)) {
      return curr
    }
  }
  return (currentPlayerIndex + direction + players.length * 100) % players.length
}
