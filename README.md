# WhatsApp API

A Node.js WhatsApp Web API using [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

## Features

- ✅ WhatsApp Web connection with QR code authentication
- ✅ Send text messages to phone numbers
- ✅ Receive and store incoming messages
- ✅ **Real-time message streaming via WebSocket (Socket.IO)**
- ✅ Message history management
- ✅ Environment variable configuration
- ✅ Docker support

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- WhatsApp mobile app for QR code scanning

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd whatsapp-api

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
HOST=127.0.0.1
PORT=3000

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Environment
NODE_ENV=development
```

### Running the API

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication & Status

- `GET /status` - Get WhatsApp connection status
- `GET /qr` - Get QR code for authentication
- `POST /logout` - Logout from WhatsApp

### Messaging

- `GET /message` - Message form (web interface)
- `POST /message` - Send a message
  - Body: `{ "phoneNumber": "+1234567890", "message": "Hello!" }`

### Message Management

- `GET /messages` - Get all received messages
- `DELETE /messages` - Clear all received messages
- `GET /messages/stream` - Stream messages in real-time (SSE)
- `GET /messages/paginated` - Get paginated messages
  - Query params: `page`, `limit`

### Real-time Chat

- `GET /realtime` - **Real-time chat monitoring page (WebSocket)**
- `GET /api/realtime/status` - Get real-time status

## Real-time WebSocket Communication

The API supports **true real-time** message streaming using Socket.IO WebSockets.

### WebSocket Events

**Client → Server:**
- `clear_messages` - Clear all messages
- `refresh_messages` - Refresh message list
- `get_status` - Get current status

**Server → Client:**
- `connect` - Client connected
- `disconnect` - Client disconnected
- `status` - Initial status on connection
- `status_update` - Status updates
- `existing_messages` - Previously received messages
- `new_message` - Real-time incoming message
- `messages_cleared` - Messages cleared confirmation
- `messages_refreshed` - Messages refreshed with data

### Connect to WebSocket

```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to WebSocket server');
});

socket.on('new_message', (message) => {
    console.log('New message:', message);
});

socket.on('status', (status) => {
    console.log('Status:', status);
});
```

### Test WebSocket

Use the included test script:

```bash
node test-websocket.js
```

## Web Interface

### Real-time Chat Monitor

Visit `http://localhost:3000/realtime` for a live chat monitoring interface featuring:

- **Real-time connection status** with visual indicators
- **Live message streaming** with instant updates
- **Message type filtering** (text, image, video, audio, document)
- **Message management** (clear, refresh)
- **Connection notifications** with status updates
- **Responsive design** for mobile and desktop

### Features

- ✅ **True real-time** - No page refreshes needed
- ✅ **Visual status indicators** - Connection, phone number, QR code
- ✅ **Message animations** - New messages slide in smoothly
- ✅ **Message categorization** - Different colors for message types
- ✅ **Auto-scroll** - New messages automatically scroll into view
- ✅ **Connection notifications** - Real-time status updates
- ✅ **Mobile responsive** - Works on all devices

## MCP Integration

This API integrates with the MCP (Model Context Protocol) WhatsApp server for AI assistant integration.

### Environment Variables for MCP

```bash
# MCP Server Configuration
MCP_HOST=127.0.0.1
MCP_PORT=3002

# WhatsApp API Configuration
WHATSAPP_API_HOST=localhost
WHATSAPP_API_PORT=3000
```

## Docker

### Build and Run

```bash
# Build the image
docker build -t whatsapp-api .

# Run the container
docker run -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  whatsapp-api
```

### Docker Compose

```bash
docker-compose up -d
```

## Development

### Project Structure

```
src/
├── controllers/     # Route handlers
├── services/        # Business logic
├── util/           # Utilities
├── views/          # Pug templates
└── public/         # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm test` - Run tests

## Troubleshooting

### Common Issues

1. **QR Code not appearing**
   - Restart the service
   - Check if WhatsApp Web is already connected on another device

2. **Connection lost**
   - The service will automatically reconnect
   - Check your internet connection

3. **Messages not received**
   - Ensure the phone number is in international format
   - Check if the contact exists in your WhatsApp

4. **WebSocket connection issues**
   - Check if the server is running on the correct port
   - Ensure no firewall is blocking WebSocket connections
   - Check browser console for connection errors

### Logs

Check the console output for detailed logs and error messages.

## License

MIT License 