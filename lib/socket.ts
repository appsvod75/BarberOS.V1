import { io } from 'socket.io-client';

// Singleton for Socket.IO connection
const socket = io('/', { path: '/socket.io' });

export default socket;
