import { Peer } from 'peerjs'

// Prefix to prevent collisions on the public PeerJS broker
const PEER_PREFIX = 'party-arcade-uno-v1-'

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
  })

  const connections = new Map() // clientPeerId -> DataConnection

  peer.on('open', (id) => {
    if (onOpen) onOpen(id, roomCode)
  })

  peer.on('connection', (conn) => {
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
      console.warn('Connection error with peer:', conn.peer, err)
    })
  })

  peer.on('error', (err) => {
    if (onError) onError(err)
  })

  return {
    peer,
    connections,
    broadcast: (data) => {
      connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(data)
          } catch (e) {
            console.error('Failed to send to client:', e)
          }
        }
      })
    },
    sendTo: (clientPeerId, data) => {
      const conn = connections.get(clientPeerId)
      if (conn && conn.open) {
        try {
          conn.send(data)
        } catch (e) {
          console.error('Failed to send to client:', e)
        }
      }
    },
    destroy: () => {
      connections.forEach((conn) => conn.close())
      connections.clear()
      peer.destroy()
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
  })

  let hostConn = null

  peer.on('open', () => {
    const hostPeerId = formatPeerId(roomCode)
    hostConn = peer.connect(hostPeerId, {
      reliable: true,
    })

    hostConn.on('open', () => {
      // Send JOIN payload to host
      hostConn.send({
        type: 'JOIN',
        player,
      })

      if (onConnected) onConnected(hostConn)
    })

    hostConn.on('data', (data) => {
      if (onData) onData(data)
    })

    hostConn.on('close', () => {
      if (onDisconnected) onDisconnected()
    })

    hostConn.on('error', (err) => {
      if (onError) onError(err)
    })
  })

  peer.on('error', (err) => {
    if (onError) onError(err)
  })

  return {
    peer,
    sendAction: (data) => {
      if (hostConn && hostConn.open) {
        try {
          hostConn.send(data)
        } catch (e) {
          console.error('Failed to send action to host:', e)
        }
      }
    },
    destroy: () => {
      if (hostConn) hostConn.close()
      peer.destroy()
    },
  }
}
