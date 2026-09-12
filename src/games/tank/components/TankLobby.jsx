import React from 'react'
import { DEFAULT_TANK_TYPE } from '../constants/tankConstants'
import TankLobbyLanding from './lobby/TankLobbyLanding'
import TankLobbyRoom from './lobby/TankLobbyRoom'

// Router only. The landing and room screens are unrelated views that happened
// to share a file, separated by an early return halfway down it.
export default function TankLobby({
  mode,
  onSelectMode,
  roomCode,
  inputCode,
  onChangeInputCode,
  playerName,
  onChangePlayerName,
  isHost,
  connectionStatus,
  players, // array of { id, name, peerId, slotId, team, isReady, isHost, tankType }
  mySlotId,
  myPeerId,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onSelectSlot,
  onToggleReady,
  onStartGame,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onBackToMenu,
  error,
}) {
  const isInRoom =
    roomCode && connectionStatus !== 'disconnected' && connectionStatus !== 'idle'

  if (!isInRoom) {
    return (
      <TankLobbyLanding
        mode={mode}
        onSelectMode={onSelectMode}
        inputCode={inputCode}
        onChangeInputCode={onChangeInputCode}
        playerName={playerName}
        onChangePlayerName={onChangePlayerName}
        selectedTank={selectedTank}
        onSelectTank={onSelectTank}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
        onBackToMenu={onBackToMenu}
        error={error}
      />
    )
  }

  return (
    <TankLobbyRoom
      mode={mode}
      roomCode={roomCode}
      isHost={isHost}
      players={players}
      mySlotId={mySlotId}
      myPeerId={myPeerId}
      selectedTank={selectedTank}
      onSelectTank={onSelectTank}
      onSelectSlot={onSelectSlot}
      onToggleReady={onToggleReady}
      onStartGame={onStartGame}
      onLeaveRoom={onLeaveRoom}
    />
  )
}
