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

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js 5
- **Database**: PostgreSQL 15 + Drizzle ORM
- **Queue**: BullMQ + Redis
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Run Locally

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
npx drizzle-kit push

# Start API server
npm run dev

# Start worker (in another terminal)
npm run worker
```

### Run with Docker Compose (Full Stack)

```bash
docker-compose up --build
```

This starts:
- API server on port 3000
- Background worker
- PostgreSQL on port 5432
- Redis on port 6379

## API Endpoints

### Pipelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pipelines` | Create pipeline |
| GET | `/pipelines` | List all pipelines |
| GET | `/pipelines/:id` | Get pipeline by ID |
| DELETE | `/pipelines/:id` | Delete pipeline |

**Create Pipeline:**
```bash
curl -X POST http://localhost:3000/pipelines \
  -H "Content-Type: application/json" \
  -d '{"name": "My Pipeline", "actionType": "transform"}'
```

### Subscribers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subscribers/:pipelineId` | Add subscriber |
| GET | `/subscribers/:pipelineId` | List subscribers |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/:key` | Receive webhook |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs` | List all jobs |
| GET | `/jobs/:id` | Get job by ID |
| GET | `/jobs/pipeline/:pipelineId` | Get jobs by pipeline |

## Processing Actions

Three built-in action types:

1. **transform** - Transform webhook payload
   - `uppercase` - Convert all string values to uppercase
   - `lowercase` - Convert all string values to lowercase
   - `compact` - Remove null/empty values

2. **filter** - Filter specific fields from payload

3. **enrich** - Add additional data to payload
   - Adds `_enriched: true` and `_enrichedAt` timestamp

## Example Usage

```bash
# 1. Create a pipeline
PIPELINE=$(curl -s -X POST http://localhost:3000/pipelines \
  -H "Content-Type: application/json" \
  -d '{"name": "Notify Service", "actionType": "transform"}')
echo $PIPELINE

# 2. Extract webhook key
KEY=$(echo $PIPELINE | jq -r '.webhookUrl' | sed 's|.*/||')
echo $KEY

# 3. Add subscriber
curl -X POST "http://localhost:3000/subscribers/$(echo $PIPELINE | jq -r '.pipeline.id')" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/webhook"}'

# 4. Send webhook
curl -X POST "http://localhost:3000/webhooks/$KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "data": {"name": "Test"}}'

# 5. Check job status
curl http://localhost:3000/jobs
```

## Design Decisions

### Why BullMQ + Redis?
- Reliable job queue with built-in retry logic
- Distributed processing support
- Low latency

### Why Drizzle ORM?
- Lightweight and type-safe
- SQL-like syntax, easy to debug
- Great performance

### Background Processing
- Webhooks are queued immediately (fast response)
- Worker processes jobs asynchronously
- Jobs update status in database for visibility

### Retry Logic
- 3 retry attempts with exponential backoff
- Failed deliveries marked in job status
- Partial failure support (some subscribers may fail)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://postgres:postgres@localhost:5432/webhook_db | PostgreSQL connection |
| REDIS_HOST | 127.0.0.1 | Redis host |
| REDIS_PORT | 6379 | Redis port |
| PORT | 3000 | API server port |

## Project Structure

```
src/
├── app.ts                    # Express app setup
├── server.ts                 # Entry point
├── config/
│   └── queue.ts             # BullMQ configuration
├── db/
│   ├── schema.ts            # Database schema
│   └── index.ts             # DB connection
├── modules/
│   ├── pipelines/           # Pipeline CRUD
│   ├── webhooks/           # Webhook ingestion
│   ├── subscribers/        # Subscriber management
│   └── jobs/               # Job status API
└── workers/
    └── job.worker.ts        # Background job processor
```

## License

ISC
