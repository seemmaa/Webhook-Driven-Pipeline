# Webhook Pipeline Service

A webhook-driven task processing pipeline that receives webhooks, processes them through a job queue, and delivers results to registered subscribers.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Webhook    │────▶│   Job       │────▶│  Worker     │
│             │     │  Ingestion  │     │   Queue     │     │  Processing │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                      │
                                                                      ▼
                                                               ┌─────────────┐
                                                               │ Subscribers │
                                                               │  (HTTP)     │
                                                               └─────────────┘
```

### Data Flow

1. **Ingestion**: Client sends webhook to `/webhooks/:key`
2. **Queueing**: Webhook payload is queued in Redis (BullMQ)
3. **Processing**: Worker picks up job, applies transformation/enrichment
4. **Delivery**: Processed payload sent to all pipeline subscribers
5. **Tracking**: Job status stored in PostgreSQL for visibility

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js 5
- **Database**: PostgreSQL 15 + Drizzle ORM
- **Queue**: BullMQ + Redis
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Auth**: JWT + bcrypt

## Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis (or use Docker)

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
npx drizzle-kit push

# Start API server
npm run dev

# Start worker (in another terminal)
npm run worker
```

### Docker Compose (Full Stack)

```bash
docker-compose up --build
```

Services started:
- API server: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://postgres:postgres@localhost:5432/webhook_db | PostgreSQL connection |
| REDIS_HOST | 127.0.0.1 | Redis host |
| REDIS_PORT | 6379 | Redis port |
| PORT | 3000 | API server port |
| JWT_SECRET | your-secret-key | JWT signing key |

## API Documentation

### Authentication

All protected routes require `Authorization: Bearer <token>` header.

#### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Pipelines

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/pipelines` | Create pipeline | Yes |
| GET | `/pipelines` | List all pipelines | Yes |
| GET | `/pipelines/:id` | Get pipeline by ID | Yes |
| DELETE | `/pipelines/:id` | Delete pipeline | Yes |

#### Create Pipeline

```http
POST /pipelines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Pipeline",
  "actionType": "transform",
  "options": {
    "transformType": "uppercase"
  }
}
```

Response:
```json
{
  "pipeline": {
    "id": "uuid",
    "name": "My Pipeline",
    "webhookKey": "unique-key",
    "actionType": "transform"
  },
  "webhookUrl": "http://localhost:3000/webhooks/unique-key"
}
```

#### Action Types

- `transform` - Transform webhook payload
- `filter` - Filter specific fields from payload
- `enrich` - Add additional data to payload

**Transform Options:**
- `uppercase` - Convert all string values to uppercase
- `lowercase` - Convert all string values to lowercase
- `compact` - Remove null/empty values

### Subscribers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/subscribers/:pipelineId` | Add subscriber | Yes |
| GET | `/subscribers/:pipelineId` | List subscribers | Yes |
| DELETE | `/subscribers/:id` | Remove subscriber | Yes |

#### Add Subscriber

```http
POST /subscribers/:pipelineId
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/webhook"
}
```

### Webhooks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/webhooks/:key` | Receive webhook | No |

```http
POST /webhooks/:key
Content-Type: application/json

{
  "message": "Hello",
  "data": { "name": "Test" }
}
```

### Jobs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/jobs` | List all jobs | Yes |
| GET | `/jobs/:id` | Get job by ID | Yes |
| GET | `/jobs/pipeline/:pipelineId` | Get jobs by pipeline | Yes |

## Project Structure

```
src/
├── app.ts                    # Express app setup & middleware
├── server.ts                 # Entry point
├── config/
│   └── queue.ts              # BullMQ configuration
├── db/
│   ├── schema.ts             # Drizzle schema (pipelines, subscribers, jobs, users)
│   └── index.ts              # DB connection
├── modules/
│   ├── pipelines/           # Pipeline CRUD operations
│   ├── webhooks/            # Webhook ingestion endpoint
│   ├── subscribers/         # Subscriber management
│   ├── jobs/                # Job status API
│   ├── auth/                # Register & login
│   └── middleware/
│       ├── auth.middleware.ts    # JWT verification
│       └── limiter.middleware.ts # Rate limiting
├── workers/
│   └── job.worker.ts        # Background job processor
└── utils/
    └── jwt.ts               # JWT utilities
```

## Design Decisions

### Why BullMQ + Redis?

- **Reliability**: Built-in retry logic with exponential backoff
- **Performance**: Sub-millisecond job processing
- **Scalability**: Distributed worker support
- **Visibility**: Job progress tracking and completion handling

### Why Drizzle ORM?

- **Type Safety**: Full TypeScript support
- **Lightweight**: No runtime overhead
- **SQL-like**: Easy to debug and understand
- **Migration Support**: Built-in migration tooling

### Async Processing Pattern

```
[Webhook Request] → [Fast Response] → [Queue] → [Worker] → [Subscribers]
         │                                     │
         └──────── 200 OK immediately ────────┘
```

Webhooks return 200 immediately after queuing. This ensures:
- Fast client response times
- Decoupled processing
- Resilient to worker restarts
- Queue persistence during downtime

### Retry Strategy

- 3 retry attempts with exponential backoff (1s, 2s, 4s)
- Failed deliveries tracked in job status
- Partial failure support: individual subscriber failures don't block others

### Security

- **Rate Limiting**: 100 requests/15 min per IP
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Auth**: Token expiration and signature verification

## Example Usage

```bash
# 1. Register & Login
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' | jq -r '.token')

# 2. Create a pipeline
PIPELINE=$(curl -s -X POST http://localhost:3000/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Notify Service", "actionType": "transform", "options": {"transformType": "uppercase"}}')
echo $PIPELINE

KEY=$(echo $PIPELINE | jq -r '.webhookUrl' | sed 's|.*/||')
PIPELINE_ID=$(echo $PIPELINE | jq -r '.pipeline.id')

# 3. Add subscriber
curl -X POST "http://localhost:3000/subscribers/$PIPELINE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/webhook"}'

# 4. Send webhook (no auth required)
curl -X POST "http://localhost:3000/webhooks/$KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "data": {"name": "Test"}}'

# 5. Check job status
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/jobs
```

## Testing

```bash
# Run TypeScript type check
npm run build
```

## License

ISC