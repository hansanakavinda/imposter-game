import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-turn-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/turn', (req, res) => {
            const username = env.METERED_USERNAME || env.VITE_METERED_USERNAME
            const credential = env.METERED_CREDENTIAL || env.VITE_METERED_CREDENTIAL

            const iceServers = [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun.relay.metered.ca:80' },
            ]

            if (username && credential) {
              const user = username.trim()
              const cred = credential.trim()
              iceServers.push(
                { urls: 'turn:global.relay.metered.ca:80', username: user, credential: cred },
                { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: user, credential: cred },
                { urls: 'turn:global.relay.metered.ca:443', username: user, credential: cred },
                { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: user, credential: cred },
              )
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ iceServers }))
          })
        },
      },
    ],
    server: {
      host: true, // Listen on all local IPs so mobile devices on the same Wi-Fi can connect
      port: 5173,
    },
  }
})
