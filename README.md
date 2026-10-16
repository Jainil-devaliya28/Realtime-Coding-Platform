# 🚀 Realtime Distributed AI Code Execution Platform

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment%20Live-brightgreen?logo=vercel)](https://realtime-code-platform.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/Jainil-devaliya28/Realtime-Coding-Platform)

A production-grade, collaborative cloud IDE platform with real-time code editing, AI debugging assistance, secure Docker-based code execution, and comprehensive analytics.

> Think Replit + LeetCode + GitHub Codespaces — built from scratch.

---

## 📸 Features

- **🔐 Authentication** — JWT access tokens, refresh tokens, secure cookies, bcrypt hashing
- **👥 Real-Time Collaboration** — Multiple users editing simultaneously via Socket.IO + Operational Transform
- **⚡ Code Execution Engine** — BullMQ distributed queue → isolated Docker containers
- **🤖 AI Debugging Assistant** — GPT-4 powered error analysis, code explanation, test generation
- **📊 Analytics Dashboard** — Recharts visualizations, execution trends, language distribution
- **🛡️ Security** — Container isolation, network restrictions, rate limiting, Helmet, CORS
- **📡 Live Output Streaming** — Redis pub/sub bridges worker stdout/stderr to WebSocket clients
- **📈 Monitoring** — Prometheus metrics + Grafana dashboards
- **🌐 Multi-Language** — Python, JavaScript, C++, Java, Verilog (with Icarus Verilog)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│              (Reverse Proxy + Rate Limiting)                 │
└────────────┬────────────────────────┬───────────────────────┘
             │                        │
    ┌────────▼────────┐      ┌────────▼────────┐
    │    Frontend      │      │    Backend API   │
    │   (Next.js 15)  │      │  (Express + WS)  │
    │   Port: 3000    │      │   Port: 4000     │
    └─────────────────┘      └────────┬────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              │                       │                      │
    ┌─────────▼────────┐   ┌──────────▼──────┐   ┌──────────▼──────┐
    │    PostgreSQL     │   │     Redis        │   │   BullMQ Queue  │
    │  (Primary DB)    │   │ (Cache + Pub/Sub) │   │  (Job Manager)  │
    └──────────────────┘   └──────────────────┘   └────────┬────────┘
                                                            │
                                            ┌───────────────┼──────────────┐
                                            │               │              │
                                  ┌─────────▼──────┐ ┌──────▼───────┐     │
                                  │   Worker 1      │ │   Worker 2   │  ...│
                                  │ (BullMQ Worker) │ │              │     │
                                  └────────┬────────┘ └──────┬───────┘     │
                                           │                 │
                                  ┌────────▼─────────────────▼─────────┐
                                  │       Docker Sandbox Containers      │
                                  │  Python | JS | C++ | Java | Verilog │
                                  │  (Isolated, memory/CPU/net limits)  │
                                  └─────────────────────────────────────┘
```

### Data Flow: Code Execution

```
User clicks Run
    → Socket.IO "execution:run" event
    → Backend creates ExecutionJob in PostgreSQL
    → Job pushed to BullMQ Redis queue
    → Worker picks up job
    → Worker spawns isolated Docker container
    → Container executes code with resource limits
    → Worker streams stdout/stderr via Redis pub/sub
    → Backend subscribes, forwards to WebSocket room
    → User sees live output in terminal panel
    → On completion: result saved to ExecutionHistory
```

---

## 📁 Project Structure

```
realtime-code-platform/
├── apps/
│   ├── frontend/           # Next.js 15 + TypeScript + TailwindCSS
│   │   └── src/
│   │       ├── app/        # App Router pages
│   │       ├── components/ # UI components
│   │       ├── stores/     # Zustand state management
│   │       └── lib/        # API client, socket, utils
│   ├── backend/            # Express.js + Socket.IO + Prisma
│   │   └── src/
│   │       ├── controllers/ # HTTP request handlers
│   │       ├── services/    # Business logic
│   │       ├── middleware/  # Auth, validation, rate limiting
│   │       ├── routes/      # Express routers
│   │       └── workers/     # Socket.IO + Redis bridge
│   └── worker/             # BullMQ code execution workers
│       └── src/
│           ├── queue/       # BullMQ processor
│           └── sandbox/     # Docker sandbox executor
├── packages/
│   └── shared/             # Shared TypeScript types + constants
├── infrastructure/
│   ├── nginx/              # Reverse proxy config
│   ├── prometheus/         # Metrics scraping config
│   └── grafana/            # Dashboard configs
├── docker/
│   └── executors/          # Language-specific Dockerfiles
├── scripts/                # Setup and utility scripts
├── .github/workflows/      # CI/CD pipeline
└── docker-compose.yml      # Full stack orchestration
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop (or Docker Engine + Compose)
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- OpenAI API key (optional, for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/realtime-code-platform.git
cd realtime-code-platform
npm install
```

### 2. Configure Environment

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your values

# Worker
cp apps/worker/.env.example apps/worker/.env

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local
```

**Required backend .env values:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codeplatform
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret-min-32-chars-here-please
JWT_REFRESH_SECRET=your-other-secret-min-32-chars-here
COOKIE_SECRET=your-cookie-secret-min-32-chars-here
OPENAI_API_KEY=sk-...   # Optional but needed for AI features
```

### 3. Build Executor Images

```bash
./scripts/build-executors.sh
```

This builds Docker images for each supported language:
- `code-executor-python` — Python 3
- `code-executor-node` — Node.js 20
- `code-executor-cpp` — GCC + G++
- `code-executor-java` — JDK 21
- `code-executor-verilog` — Icarus Verilog

### 4. Database Setup

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

### 5. Run in Development

```bash
# Terminal 1: Backend
cd apps/backend && npm run dev

# Terminal 2: Frontend
cd apps/frontend && npm run dev

# Terminal 3: Worker
cd apps/worker && npm run dev
```

Visit: http://localhost:3000

**Demo credentials:**
- Admin: `admin@codeplatform.dev` / `admin123456`
- User: `alice@example.com` / `demo123456`

---

## 🐳 Docker Compose (Full Stack)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f worker

# Run migrations
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed

# Stop
docker-compose down
```

**Services:**
| Service | Port | Description |
|---------|------|-------------|
| nginx | 80 | Reverse proxy |
| frontend | 3000 | Next.js app |
| backend | 4000 | API + WebSocket |
| worker | — | Code execution workers |
| postgres | 5432 | Primary database |
| redis | 6379 | Cache + queue |
| prometheus | 9090 | Metrics |
| grafana | 3001 | Dashboards (admin/admin123) |

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get profile |

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List public rooms |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/:id` | Get room |
| PUT | `/api/rooms/:id` | Update room |
| DELETE | `/api/rooms/:id` | Delete room |

### Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/execution/rooms/:id/execute` | Run code |
| GET | `/api/execution/jobs/:jobId` | Job status |
| GET | `/api/execution/rooms/:id/history` | Execution history |
| GET | `/api/execution/queue/stats` | Queue stats |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/rooms/:id/ask` | Ask AI (SSE stream) |
| POST | `/api/ai/explain` | Explain code |
| POST | `/api/ai/analyze-error` | Analyze error |
| POST | `/api/ai/generate-tests` | Generate tests |
| POST | `/api/ai/optimize` | Optimize code |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Platform stats |
| GET | `/api/analytics/trends` | Execution trends |
| GET | `/api/analytics/me` | User analytics |

---

## 🔌 WebSocket Events

### Client → Server

```typescript
socket.emit("room:join", { roomId, token })
socket.emit("room:leave", { roomId })
socket.emit("code:change", { type, position, text, version })
socket.emit("code:cursor", { lineNumber, column })
socket.emit("code:typing", isTyping)
socket.emit("execution:run", { code, language, stdin })
socket.emit("ai:ask", { message, code, error, conversationId })
```

### Server → Client

```typescript
socket.on("room:joined", ({ room, users }) => ...)
socket.on("room:user_joined", (user) => ...)
socket.on("room:user_left", ({ userId }) => ...)
socket.on("code:change", (change) => ...)
socket.on("code:cursor", ({ userId, cursor }) => ...)
socket.on("execution:started", ({ jobId }) => ...)
socket.on("execution:output", ({ jobId, chunk, stream }) => ...)
socket.on("execution:completed", (result) => ...)
socket.on("ai:response", ({ conversationId, chunk, done }) => ...)
```

---

## 🛡️ Security Architecture

### Execution Sandbox

Each code execution runs in an isolated Docker container with:
- **No network access** (`NetworkDisabled: true`)
- **Memory limit**: 256MB (configurable)
- **CPU quota**: 50% of one CPU
- **PID limit**: 50 processes
- **Read-only root filesystem** for language containers
- **Dropped all Linux capabilities** (`CapDrop: ALL`)
- **Timeout**: 30 seconds hard kill
- **Ephemeral**: Container removed after execution
- **Temp filesystem**: Code files written to `/tmp`, cleaned up after

### API Security

- **JWT authentication** with short-lived access tokens (15m)
- **Refresh token rotation** — each refresh invalidates the old token
- **HTTP-only cookies** for refresh tokens (XSS-resistant)
- **Rate limiting**: 100/15min general, 10/15min auth, 10/min execution
- **Helmet.js** — security headers (CSP, HSTS, etc.)
- **Input validation** via Zod schemas on all endpoints
- **CORS** restricted to known frontend origin

---

## 📈 Scaling Architecture

### Horizontal Worker Scaling

Workers are stateless BullMQ consumers. To scale:

```bash
# Add more workers via docker-compose scale
docker-compose up -d --scale worker=5

# Or deploy on separate machines pointing to same Redis
REDIS_URL=redis://your-redis-host:6379 npm start
```

### Database Scaling

- **Read replicas**: Configure `DATABASE_URL` with PgBouncer for connection pooling
- **Prisma** supports multiple database connections natively

### Redis Cluster

For high availability, replace single Redis with Redis Sentinel or Redis Cluster:

```env
REDIS_URL=redis://sentinel1:26379,sentinel2:26379/mymaster
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Backend only
npm run test --workspace=apps/backend

# Watch mode
cd apps/backend && npm run test -- --watch
```

---

## 📊 Monitoring

### Prometheus Metrics

Available at `http://localhost:4000/metrics`:

- `codeplatform_http_request_duration_seconds` — API latency
- `codeplatform_executions_total` — Execution counts by language/status
- `codeplatform_execution_duration_seconds` — Execution time distribution
- `codeplatform_execution_queue_size` — Current queue depth
- `codeplatform_ws_connections_active` — Live WebSocket connections
- `codeplatform_ai_request_duration_seconds` — AI API latency
- Default Node.js metrics (CPU, memory, event loop)

### Grafana

Access at http://localhost:3001 (admin / admin123)

Add Prometheus as data source: `http://prometheus:9090`

---

## 🚢 Production Deployment

```bash
# 1. Set production environment variables
cp .env.example .env
# Edit .env with production secrets

# 2. Build executor images
./scripts/build-executors.sh

# 3. Start stack
docker-compose -f docker-compose.yml up -d

# 4. Run migrations
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run db:seed

# 5. Verify
curl http://localhost/health
```

---

## 🏛️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Monaco Editor |
| State | Zustand, React Query |
| Real-time | Socket.IO (WebSocket) |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Queue | Redis + BullMQ |
| Workers | Node.js + Dockerode |
| AI | OpenAI GPT-4 |
| Monitoring | Prometheus + Grafana |
| Proxy | NGINX |
| CI/CD | GitHub Actions |
| Containers | Docker + Docker Compose |

---

## 📄 License

MIT © 2025 CodePlatform
