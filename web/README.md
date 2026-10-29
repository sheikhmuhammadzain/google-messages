# Google Messages Web App

React web application for sending and receiving SMS messages through a paired mobile device.

## Features

- 🔐 QR code authentication
- 💬 Real-time message sync
- 📤 Send messages from browser
- 🎨 Material-UI design
- 📱 Responsive layout
- 🔔 Desktop notifications (coming soon)

## Prerequisites

- Node.js 18+
- Backend server running
- Mobile app installed and paired

## Installation

```bash
npm install
```

## Configuration

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Development

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Vercel

```bash
npm run build
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Project Structure

```
web/
├── src/
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # API and Socket services
│   ├── store/            # Zustand state management
│   ├── utils/            # Helper functions
│   ├── config/           # Configuration
│   ├── types/            # TypeScript types
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── index.html
├── vite.config.ts
└── package.json
```

## Usage

### 1. Authentication

1. Open web app in browser
2. QR code will be displayed
3. Open mobile app → Settings → Pair with Web
4. Scan QR code
5. Wait for pairing confirmation

### 2. Messaging

- Select conversation from sidebar
- Type message in input field
- Press Enter or click Send button
- Messages sync in real-time

## State Management

Using Zustand for global state:

```typescript
import { useMessagesStore } from '@/store/messagesStore';

const { conversations, messages, addMessage } = useMessagesStore();
```

## Services

### Socket Service

```typescript
import socketService from '@/services/socketService';

// Initialize with session token
socketService.initialize(sessionToken);

// Listen to events
socketService.on('message:new', (message) => {
  console.log('New message:', message);
});

// Send message
socketService.sendMessage(phoneNumber, text, tempId);
```

### API Service

```typescript
import apiService from '@/services/apiService';

// Generate QR code
const qrData = await apiService.generateQR();

// Wait for pairing
const sessionToken = await apiService.waitForPairing(token);

// Verify session
const isValid = await apiService.verifySession(sessionToken);
```

## Styling

Using Material-UI (MUI) with custom theme:

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976D2' },
    // ... other colors
  },
});
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### QR Code Not Loading

1. Check backend server is running
2. Verify VITE_API_URL in .env
3. Check browser console for errors
4. Clear browser cache

### Messages Not Syncing

1. Ensure mobile device is online
2. Check WebSocket connection status
3. Verify session token is valid
4. Try refreshing the page

### Connection Issues

1. Check CORS settings in backend
2. Verify Socket.IO configuration
3. Check network firewall settings
4. Try using HTTP instead of HTTPS for local development

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_SOCKET_URL` | WebSocket server URL | `http://localhost:3000` |

## Performance

- Code splitting with React.lazy
- Optimized bundle size with Vite
- Virtual scrolling for message lists (coming soon)
- Service worker for offline support (coming soon)

## Security

- Session tokens stored in localStorage
- HTTPS required for production
- CORS validation on backend
- XSS protection with React

## License

MIT
