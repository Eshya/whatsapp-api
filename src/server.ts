import app from './app';
import { HOST, PORT } from './util/environment';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WhatsappService } from './services/whatsapp-service';

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize WhatsApp service
const wa = new WhatsappService();

let isInitializing = false;

async function initializeWhatsAppService() {
  if (isInitializing) {
    console.log('⚠️ WhatsApp service is already initializing...');
    return;
  }
  
  isInitializing = true;
  
  try {
    console.log('🚀 Initializing WhatsApp service...');
    await wa.Initialize();
    console.log('✅ WhatsApp service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp service:', error);
  } finally {
    isInitializing = false;
  }
}

// Initialize on startup
initializeWhatsAppService();

// Set up WhatsApp message callback to broadcast to all connected clients
console.log('📡 Setting up WhatsApp message callback...');
wa.onMessage((message) => {
  try {
    console.log('📡 Broadcasting new message to all clients:', message);
    io.emit('new_message', message);
    console.log('✅ Message broadcasted successfully');
  } catch (error) {
    console.error('❌ Error broadcasting message:', error);
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  try {
    // Send initial status
    const status = wa.GetStatus();
    console.log('📊 Sending initial status to client:', status);
    socket.emit('status', status);
    
    // Send existing messages
    const messages = wa.getReceivedMessages();
    console.log(`📥 Sending ${messages.length} existing messages to client`);
    if (messages.length > 0) {
      socket.emit('existing_messages', messages);
    }
  } catch (error) {
    console.error('❌ Error sending initial data to client:', error);
    // Send error status to client
    socket.emit('status', {
      isConnected: false,
      phoneNumber: "",
      qrcode: "",
      needRestart: true
    });
  }
  
  // Handle get_status request
  socket.on('get_status', () => {
    try {
      const status = wa.GetStatus();
      console.log('📊 Status requested by client:', status);
      socket.emit('status_update', status);
    } catch (error) {
      console.error('❌ Error getting status:', error);
      socket.emit('status_update', {
        isConnected: false,
        phoneNumber: "",
        qrcode: "",
        needRestart: true
      });
    }
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Handle clear messages request
  socket.on('clear_messages', () => {
    try {
      wa.clearReceivedMessages();
      socket.emit('messages_cleared');
      console.log('🗑️ Messages cleared by client:', socket.id);
    } catch (error) {
      console.error('❌ Error clearing messages:', error);
    }
  });
  
  // Handle refresh messages request
  socket.on('refresh_messages', () => {
    try {
      const messages = wa.getReceivedMessages();
      socket.emit('messages_refreshed', messages);
      console.log('🔄 Messages refreshed by client:', socket.id);
    } catch (error) {
      console.error('❌ Error refreshing messages:', error);
    }
  });
  
  // Handle restart request
  socket.on('restart_service', () => {
    try {
      console.log('🔄 Manual restart requested by client');
      initializeWhatsAppService();
      socket.emit('restart_initiated');
    } catch (error) {
      console.error('❌ Error restarting service:', error);
    }
  });
});

// Override GetStatus to emit updates to all clients
const originalGetStatus = wa.GetStatus.bind(wa);
wa.GetStatus = function() {
  const status = originalGetStatus();
  console.log('📊 Status updated, broadcasting to all clients:', status);
  io.emit('status_update', status);
  return status;
};

// Set up periodic status broadcast (every 5 seconds)
setInterval(() => {
  try {
    const status = wa.GetStatus();
    if (status.isConnected) {
      console.log('📊 Periodic status broadcast:', status);
      io.emit('status_update', status);
    } else if (status.needRestart) {
      console.log('🔄 WhatsApp service needs restart');
      initializeWhatsAppService();
    }
  } catch (error) {
    console.error('❌ Error in periodic status check:', error);
  }
}, 5000);

// Health check every 30 seconds
setInterval(() => {
  try {
    const status = wa.GetStatus();
    if (!status.isConnected && !status.qrcode && !status.needRestart) {
      console.log('🔄 WhatsApp service appears disconnected, attempting restart...');
      initializeWhatsAppService();
    }
  } catch (error) {
    console.error('❌ Error in health check:', error);
  }
}, 30000);

server.listen(PORT, HOST, () => {
  console.log(
    " App is running at http://%s:%d in %s mode",
    HOST,
    PORT,
    app.get('env')
  );
  console.log(" WebSocket server is ready for real-time communication");
  console.log(" Press CTRL+C to stop\n");
});

export default server;