# LiteTrack

LiteTrack is a full-stack team collaboration progress tracker built from `implementation_plan.md`.

## Stack

- Client: Vue 3, Vite, Vue Router, Pinia, Axios, Socket.io client, vanilla CSS
- Server: Node.js, Express, Socket.io, Knex, SQLite, JWT cookies, CSRF header checks
- Database: SQLite file stored under `data/litetrack.db`

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

Seeded demo accounts:

- `admin` / `password123` - instance admin
- `teamadmin` / `password123` - team admin
- `member` / `password123` - team member

## Verification

```bash
cd server
npm run test
```

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
