# Environment Variables

This WhatsApp API supports the following environment variables:

## Server Configuration

- `HOST` - The host address to bind to (default: `0.0.0.0`)
- `PORT` - The port number to listen on (default: `80`)

## Session Configuration

- `SESSION_SECRET` - Secret key for session management (auto-generated if not provided)

## Database Configuration (Optional)

- `DB_CONNECTION_STRING` - MongoDB connection string (optional)

## Environment

- `NODE_ENV` - Node environment (development/production)

## Example .env file

```env
# Server Configuration
HOST=0.0.0.0
PORT=3000

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Database Configuration (optional)
DB_CONNECTION_STRING=mongodb://localhost:27017/whatsapp-api

# Environment
NODE_ENV=development
```

## Usage Examples

### Development
```bash
HOST=127.0.0.1 PORT=3000 npm run dev
```

### Production
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
```

### Docker
```bash
docker run -e HOST=0.0.0.0 -e PORT=80 your-whatsapp-api
``` 