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
