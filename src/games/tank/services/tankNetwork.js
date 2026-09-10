import { Peer } from 'peerjs'
import { preloadIceConfig, getIceConfig } from '../../uno/services/unoNetwork'

const PEER_PREFIX = 'party-arcade-tank-v1-'

export function formatTankPeerId(roomCode) {
  return `${PEER_PREFIX}${roomCode.trim().toLowerCase()}`
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Tank Multiplayer Network Controller
 * Handles PeerJS WebRTC connections, lobby handshakes, and input streaming.
 */
export class TankNetwork {
  constructor({
    onStatusChange,
    onClientJoin,
    onPlayerLeave,
    onMessage,
    onError,
  }) {
    this.onStatusChange = onStatusChange || (() => {})
    this.onClientJoin = onClientJoin || (() => {})
    this.onPlayerLeave = onPlayerLeave || (() => {})
    this.onMessage = onMessage || (() => {})
    this.onError = onError || (() => {})

    this.peer = null
    this.isHost = false
    this.roomCode = null
    this.connections = new Map() // peerId -> DataConnection
    this.hostConnection = null   // For client to talk to host
    this.myPeerId = null
  }

  async init(roomCode, isHost = false, clientPlayer = null) {
    this.isHost = isHost
    this.roomCode = roomCode.toUpperCase()
    const targetPeerId = isHost ? formatTankPeerId(this.roomCode) : undefined

    let iceConfig
    try {
      iceConfig = await preloadIceConfig()
    } catch {
      iceConfig = getIceConfig()
    }

    const peerOptions = {
      config: iceConfig,
      debug: 1,
    }

    return new Promise((resolve, reject) => {
      try {
        this.peer = targetPeerId ? new Peer(targetPeerId, peerOptions) : new Peer(peerOptions)

        this.peer.on('open', (id) => {
          this.myPeerId = id
          this.onStatusChange(isHost ? 'hosting' : 'connecting')

          if (!isHost) {
            const hostPeerId = formatTankPeerId(this.roomCode)
            const conn = this.peer.connect(hostPeerId, { reliable: true })
            this.hostConnection = conn

            let resolved = false
            const connectTimeout = setTimeout(() => {
              if (!resolved) {
                this.onStatusChange('disconnected')
                const timeoutErr = new Error('Could not connect to room. Check code and ensure host is in lobby.')
                this.onError(timeoutErr)
                reject(timeoutErr)
              }
            }, 12000)

            conn.on('open', () => {
              clearTimeout(connectTimeout)
              resolved = true
              this.onStatusChange('connected')

              // Send JOIN payload immediately when data channel is confirmed open
              try {
                conn.send({ type: 'JOIN', player: clientPlayer })
              } catch (e) {
                console.warn('[TankNetwork] send JOIN failed:', e)
              }
              resolve(id)
            })

            conn.on('data', (data) => {
              this.onMessage(data, hostPeerId)
            })

            conn.on('close', () => {
              clearTimeout(connectTimeout)
              this.onStatusChange('disconnected')
              this.onError(new Error('Disconnected from host'))
            })

            conn.on('error', (err) => {
              clearTimeout(connectTimeout)
              this.onError(err)
              if (!resolved) reject(err)
            })
          } else {
            resolve(id)
          }
        })

        this.peer.on('connection', (conn) => {
          if (this.isHost) {
            this.handleIncomingConnection(conn)
          }
        })

        this.peer.on('error', (err) => {
          console.error('[TankNetwork] Peer error:', err)
          this.onError(err)
          if (err.type === 'unavailable-id') {
            reject(new Error('Room code is currently in use. Please try another.'))
          } else {
            reject(err)
          }
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  handleIncomingConnection(conn) {
    this.connections.set(conn.peer, conn)

    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
    })

    conn.on('data', (data) => {
      if (data?.type === 'JOIN') {
        this.onClientJoin(conn.peer, data.player, conn)
      } else {
        this.onMessage(data, conn.peer)
      }
    })

    conn.on('close', () => {
      this.connections.delete(conn.peer)
      this.onPlayerLeave(conn.peer)
    })

    conn.on('error', (err) => {
      console.warn('[TankNetwork] Host conn error:', err)
      this.connections.delete(conn.peer)
      this.onPlayerLeave(conn.peer)
    })
  }

  broadcast(message) {
    if (this.isHost) {
      for (const [, conn] of this.connections) {
        if (conn && conn.open) {
          try {
            conn.send(message)
          } catch (e) {
            console.warn('[TankNetwork] broadcast error:', e)
          }
        }
      }
    } else if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(message)
      } catch (e) {
        console.warn('[TankNetwork] send error:', e)
      }
    }
  }

  sendToHost(message) {
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(message)
      } catch (e) {
        console.warn('[TankNetwork] sendToHost error:', e)
      }
    }
  }

  sendToPeer(peerId, message) {
    const conn = this.connections.get(peerId)
    if (conn && conn.open) {
      try {
        conn.send(message)
      } catch (e) {
        console.warn('[TankNetwork] sendToPeer error:', e)
      }
    }
  }

  destroy() {
    try {
      if (this.hostConnection) {
        this.hostConnection.close()
      }
      for (const [, conn] of this.connections) {
        conn.close()
      }
      this.connections.clear()
      if (this.peer) {
        this.peer.destroy()
      }
    } catch (e) {
      console.warn('[TankNetwork] destroy cleanup error:', e)
    }
    this.peer = null
    this.hostConnection = null
  }
}
