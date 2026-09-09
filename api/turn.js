/**
 * Vercel Serverless Function: GET /api/turn
 *
 * Securely supplies WebRTC ICE / TURN server credentials to client browsers.
 * Server environment variables (METERED_USERNAME, METERED_CREDENTIAL, etc.)
 * remain private on the backend and are NEVER baked into client-side JS bundles.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  // Cache response for up to 1 hour
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600')

  const domain = process.env.METERED_DOMAIN || process.env.VITE_METERED_DOMAIN
  const apiKey =
    process.env.METERED_SECRET_KEY ||
    process.env.METERED_API_KEY ||
    process.env.VITE_METERED_API_KEY
  const username = process.env.METERED_USERNAME || process.env.VITE_METERED_USERNAME
  const credential = process.env.METERED_CREDENTIAL || process.env.VITE_METERED_CREDENTIAL

  // 1. If Metered Domain + API Key are configured, fetch dynamic credentials from Metered REST API
  if (domain && apiKey) {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const response = await fetch(
        `https://${cleanDomain}/api/v1/turn/credentials?apiKey=${apiKey.trim()}`
      )
      if (response.ok) {
        const iceServers = await response.json()
        return res.status(200).json({
          iceServers: Array.isArray(iceServers) ? iceServers : [iceServers],
        })
      }
    } catch (err) {
      console.error('[API /turn] Failed to fetch dynamic credentials from Metered:', err)
    }
  }

  // 2. If static Metered TURN credentials are set on server
  if (username && credential) {
    const user = username.trim()
    const cred = credential.trim()

    return res.status(200).json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: user,
          credential: cred,
        },
        {
          urls: 'turn:global.relay.metered.ca:80?transport=tcp',
          username: user,
          credential: cred,
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: user,
          credential: cred,
        },
        {
          urls: 'turns:global.relay.metered.ca:443?transport=tcp',
          username: user,
          credential: cred,
        },
      ],
    })
  }

  // 3. Fallback: Google STUN
  return res.status(200).json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.relay.metered.ca:80' },
    ],
  })
}
