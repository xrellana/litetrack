import { reactive } from 'vue';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
let socket;

export const socketState = reactive({
  connected: false,
  reconnecting: false,
  error: null
});

export function getSocket() {
  if (socket) return socket;
  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false
  });

  socket.on('connect', () => {
    socketState.connected = true;
    socketState.reconnecting = false;
    socketState.error = null;
  });
  socket.on('disconnect', () => {
    socketState.connected = false;
    socketState.reconnecting = true;
  });
  socket.on('connect_error', (error) => {
    socketState.connected = false;
    socketState.reconnecting = true;
    socketState.error = error.message;
  });
  return socket;
}

export function connectSocket() {
  const activeSocket = getSocket();
  if (!activeSocket.connected) activeSocket.connect();
  return activeSocket;
}

export function joinTeamRoom(teamId) {
  return new Promise((resolve) => {
    const activeSocket = connectSocket();
    activeSocket.emit('join_team', { teamId: Number(teamId) }, (response) => {
      resolve(response);
    });
  });
}

