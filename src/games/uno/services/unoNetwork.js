import { Peer } from 'peerjs'

// Prefix to prevent collisions on the public PeerJS broker
const PEER_PREFIX = 'party-arcade-uno-v1-'

/**
 * WebRTC ICE servers configuration.
 * Includes Google STUN servers and OpenRelay public TURN servers
 * to enable NAT traversal across mobile data, cellular hotspots, and firewalls.
 */
export const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
}

/**
 * Format a human-readable room code into a global Peer ID
 */
export function formatPeerId(roomCode) {
  return `${PEER_PREFIX}${roomCode.trim().toLowerCase()}`
}

/**
 * Generate a random 4-character uppercase alphanumeric room code
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude ambiguous chars like I, 1, O, 0
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Host: Initialize Peer as room host
 */
export function initHostPeer({
  roomCode,
  onOpen,
  onClientJoin,
  onClientData,
  onClientLeave,
  onError,
}) {
  const peerId = formatPeerId(roomCode)
  const peer = new Peer(peerId, {
    debug: 1,
    config: ICE_CONFIG,
  })

  const connections = new Map() // clientPeerId -> DataConnection

  peer.on('open', (id) => {
    if (onOpen) onOpen(id, roomCode)
  })

  peer.on('connection', (conn) => {
    // Immediately register connection instance
    connections.set(conn.peer, conn)

    conn.on('open', () => {
      connections.set(conn.peer, conn)
    })

    conn.on('data', (data) => {
      if (data?.type === 'JOIN') {
        if (onClientJoin) onClientJoin(conn.peer, data.player, conn)
      } else if (onClientData) {
        onClientData(conn.peer, data)
      }
    })

    conn.on('close', () => {
      connections.delete(conn.peer)
      if (onClientLeave) onClientLeave(conn.peer)
    })

    conn.on('error', (err) => {
      console.warn('[Host] Connection error with peer:', conn.peer, err)
    })
  })

  peer.on('error', (err) => {
    console.error('[Host] Peer error:', err)
    if (onError) onError(err)
  })

  return {
    peer,
    connections,
    broadcast: (data) => {
      connections.forEach((conn, clientPeerId) => {
        try {
          conn.send(data)
        } catch (e) {
          console.error('[Host] Broadcast failed for client:', clientPeerId, e)
        }
      })
    },
    sendTo: (clientPeerId, data) => {
      const conn = connections.get(clientPeerId)
      if (conn) {
        try {
          conn.send(data)
        } catch (e) {
          console.error('[Host] sendTo failed for client:', clientPeerId, e)
        }
      } else {
        console.warn('[Host] sendTo: no active connection for peer:', clientPeerId)
      }
    },
    removeConnection: (clientPeerId) => {
      const conn = connections.get(clientPeerId)
      if (conn) {
        try {
          conn.close()
        } catch {
          // ignore
        }
        connections.delete(clientPeerId)
      }
    },
    destroy: () => {
      connections.forEach((conn) => {
        try {
          conn.close()
        } catch {
          // ignore
        }
      })
      connections.clear()
      try {
        peer.destroy()
      } catch {
        // ignore
      }
    },
  }
}

/**
 * Client: Connect to Host's room
 */
export function initClientPeer({
  roomCode,
  player,
  onConnected,
  onData,
  onDisconnected,
  onError,
}) {
  const peer = new Peer({
    debug: 1,
    config: ICE_CONFIG,
  })

  let hostConn = null
  let connectTimeout = null

  peer.on('open', () => {
    const hostPeerId = formatPeerId(roomCode)
    hostConn = peer.connect(hostPeerId, {
      reliable: true,
    })

    // Timeout if WebRTC ICE negotiation does not open within 12 seconds
    connectTimeout = setTimeout(() => {
      if (!hostConn || !hostConn.open) {
        console.warn('[Client] Connection timeout to host room:', roomCode)
        if (onError) {
          onError(
            new Error(
              'Could not connect to the room. Make sure the room code is correct and the host has the screen open and awake.'
            )
          )
        }
      }
    }, 12000)

    const handleOpen = () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      try {
        hostConn.send({
          type: 'JOIN',
          player,
        })
      } catch (e) {
        console.error('[Client] Failed to send JOIN payload:', e)
      }

      if (onConnected) onConnected(hostConn)
    }

    hostConn.on('open', handleOpen)

    hostConn.on('data', (data) => {
      if (onData) onData(data)
    })

    hostConn.on('close', () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      if (onDisconnected) onDisconnected()
    })

    hostConn.on('error', (err) => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      console.error('[Client] hostConn error:', err)
      if (onError) onError(err)
    })
  })

  peer.on('error', (err) => {
    if (connectTimeout) {
      clearTimeout(connectTimeout)
      connectTimeout = null
    }
    console.error('[Client] Peer error:', err)
    if (onError) onError(err)
  })

  return {
    peer,
    isConnected: () => Boolean(hostConn && hostConn.open),
    sendAction: (data) => {
      if (!hostConn || !hostConn.open) {
        console.warn('[Client] sendAction skipped: hostConn is not open')
        return false
      }
      try {
        hostConn.send(data)
        return true
      } catch (e) {
        console.error('[Client] Failed to send action to host:', e)
        return false
      }
    },
    destroy: () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      if (hostConn) {
        try {
          hostConn.close()
        } catch {
          // ignore
        }
      }
      try {
        peer.destroy()
      } catch {
        // ignore
      }
    },
  }
}
