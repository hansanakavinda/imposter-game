/**
 * Shared WebRTC / PeerJS infrastructure.
 *
 * Cross-game: both UNO and Tank Arena build their peers from here. Nothing in this
 * module knows anything about either game's rules.
 */

/** Cached ICE configuration for the lifetime of the page. */
let dynamicIceConfig = null

/**
 * Public STUN servers. Enough for most home Wi-Fi; strict NAT and mobile data need TURN.
 */
const PUBLIC_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
]

/** Build the four Metered TURN entries (UDP, TCP, 443, TLS) for a credential pair. */
function meteredTurnServers(username, credential) {
  const user = username.trim()
  const cred = credential.trim()
  return [
    { urls: 'turn:global.relay.metered.ca:80', username: user, credential: cred },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: user, credential: cred },
    { urls: 'turn:global.relay.metered.ca:443', username: user, credential: cred },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: user, credential: cred },
  ]
}

/**
 * Synchronous ICE configuration.
 *
 * Returns the cached result of `preloadIceConfig()` if it has already resolved,
 * otherwise falls back to public STUN plus any VITE_-prefixed Metered credentials.
 * Prefer `preloadIceConfig()` where an await is possible.
 */
export function getIceConfig() {
  if (dynamicIceConfig) {
    return dynamicIceConfig
  }

  const meteredUser = import.meta.env.VITE_METERED_USERNAME
  const meteredCred = import.meta.env.VITE_METERED_CREDENTIAL

  const iceServers = [...PUBLIC_STUN_SERVERS]
  if (meteredUser && meteredCred) {
    iceServers.push(...meteredTurnServers(meteredUser, meteredCred))
  }

  return { iceServers, iceCandidatePoolSize: 10 }
}

/**
 * Resolve and cache ICE configuration, in order of preference:
 *
 * 1. `GET /api/turn` - credentials stay server-side (Vercel function in production,
 *    the api-turn-dev-middleware plugin in dev). This is the path you want.
 * 2. A direct Metered REST call using VITE_METERED_DOMAIN + VITE_METERED_API_KEY.
 *    These are compiled into the client bundle, so this is a local-testing fallback.
 * 3. Public STUN only, via `getIceConfig()`.
 *
 * Safe to call repeatedly; only the first call does any work.
 */
export async function preloadIceConfig() {
  if (dynamicIceConfig) return dynamicIceConfig

  try {
    const res = await fetch('/api/turn')
    if (res.ok) {
      const data = await res.json()
      const servers = Array.isArray(data?.iceServers)
        ? data.iceServers
        : Array.isArray(data)
          ? data
          : null
      if (servers && servers.length > 0) {
        dynamicIceConfig = { iceServers: servers, iceCandidatePoolSize: 10 }
        return dynamicIceConfig
      }
    }
  } catch {
    // /api/turn unavailable (static host, offline); fall through
  }

  const domain = import.meta.env.VITE_METERED_DOMAIN
  const apiKey = import.meta.env.VITE_METERED_API_KEY

  if (domain && apiKey) {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const res = await fetch(
        `https://${cleanDomain}/api/v1/turn/credentials?apiKey=${apiKey.trim()}`
      )
      if (res.ok) {
        const servers = await res.json()
        dynamicIceConfig = {
          iceServers: Array.isArray(servers) ? servers : [servers],
          iceCandidatePoolSize: 10,
        }
        return dynamicIceConfig
      }
    } catch (e) {
      console.warn('[peerConfig] Dynamic TURN fetch failed, falling back to STUN:', e)
    }
  }

  return getIceConfig()
}

/** Characters used in room codes. I, 1, O and 0 are excluded to avoid misreads. */
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generate a random 4-character room code. */
export function generateRoomCode(length = 4) {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length))
  }
  return code
}

/**
 * Build a room-code-to-peer-ID formatter for one game.
 *
 * The prefix namespaces the game on the shared public PeerJS broker, so an UNO room
 * "AB12" and a Tank room "AB12" never collide.
 */
export function createPeerIdFormatter(prefix) {
  return (roomCode) => `${prefix}${String(roomCode).trim().toLowerCase()}`
}

/**
 * A shareable deep link into a room.
 *
 * App.jsx parses exactly `?game=` and `?room=`, so the builder belongs beside
 * the room codes rather than in either game -- both lobbies were composing this
 * URL by hand, differing only in the game id.
 */
export function buildRoomLink(gameId, roomCode) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}?game=${gameId}&room=${roomCode}`
}
