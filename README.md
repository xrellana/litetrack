# LiteTrack

LiteTrack is a modern, full-stack team collaboration and progress tracker. It features an intuitive, highly refined UI with robust functionalities for managing teams, tracking work items, and administering the platform.

## Features

- **Team Management**: Create and manage teams, view team members, and manage team admin roles.
- **Progress Tracking**: Track work items and update statuses in real-time.
- **Admin Dashboard**: Comprehensive instance-level administration for managing users, roles, and platform settings.
- **Internationalization (i18n)**: Multi-language support built into the client for a global user base.
- **Refined UI & Aesthetics**: Professional, polished visual design, dynamic and responsive interfaces, with curated color schemes.
- **Real-Time Collaboration**: Real-time updates pushed to clients via Socket.io.

## Stack

- **Client**: Vue 3, Vite, Vue Router, Pinia, Axios, Socket.io client, vue-i18n, lucide-vue-next, vanilla CSS
- **Server**: Node.js, Express, Socket.io, Knex, SQLite, JWT cookies, CSRF header checks
- **Database**: SQLite file stored under `data/litetrack.db`

## Local Development

Install dependencies:

```bash
cd server
npm install
cd ../client
npm install
```

Initialize the database:

```bash
cd server
npm run migrate
npm run seed
```

Start the API and frontend in separate terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Open the app at `http://127.0.0.1:5173/`.

### Seeded Demo Accounts

- `admin` / `password123` - Instance admin
- `teamadmin` / `password123` - Team admin
- `member` / `password123` - Team member

## Production Deployment

LiteTrack's frontend and backend are decoupled. For production, the frontend should be built into static assets, and the backend should run as a persistent Node.js process.

### 1. Build the Frontend

```bash
cd client
npm install
npm run build
```

This generates static assets in the `client/dist` directory. You can serve these files using a web server like Nginx, or a static hosting platform (e.g., Vercel, Netlify).

### 2. Configure the Backend

```bash
cd server
npm install --omit=dev
```

Set the following environment variables in your server environment or an `.env` file:
- `NODE_ENV=production`
- `PORT=4000` (or your chosen port)
- `JWT_SECRET=your_super_secret_key`
- `CLIENT_ORIGIN=https://your-production-domain.com` (Required for CORS and Socket.io to accept connections from your frontend)

### 3. Run Database Migrations

Before starting the server, initialize/update the production SQLite database:

```bash
cd server
npm run migrate
```

### 4. Start the Backend

In production, it's highly recommended to use a process manager like **PM2** to keep the Node.js application running and restart it automatically upon failure.

```bash
npm install -g pm2
pm2 start src/index.js --name litetrack-api
```

### 5. Nginx Reverse Proxy (Example)

If hosting both the frontend and backend on the same Linux server, you can use Nginx to serve the static frontend and reverse-proxy API & WebSocket requests to the backend.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve static frontend
    location / {
        root /path/to/litetrack/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy Socket.io connections
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
## Verification

Run backend tests:
```bash
cd server
npm run test
```

Run frontend tests & build:
```bash
cd client
npm run test
npm run build
```

## Operations

- Server environment defaults are in `server/.env.example`.
- `npm run migrate` creates a pre-migration backup when a database already exists.
- `npm run backup` writes timestamped SQLite backups to `data/backups/`.
- SQLite is intended for a single backend instance with persistent storage.
