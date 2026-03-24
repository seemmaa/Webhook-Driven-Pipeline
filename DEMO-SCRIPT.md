# Demo Script - Webhook Pipeline Service

**Duration:** ~10-12 minutes  
**Purpose:** Demonstrate understanding of architecture, implementation, and design decisions

---

## Part 1: Introduction & Architecture (2-3 min)

### What to Show:
- Draw or display the architecture diagram
- Point to each component as you explain

### Talking Points:

> "Let me walk you through my Webhook Pipeline Service - a backend system that processes incoming webhooks asynchronously and delivers processed data to subscribers."

> "Think of it like a simplified Zapier or Make.com - when a webhook comes in, we don't process it right away. We queue it and process it in the background."

---

### Architecture Breakdown:

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

**Explain each component:**

1. **Client** - External service sending webhooks to your unique URL
2. **Webhook Ingestion** - API endpoint that accepts webhooks, returns immediately
3. **Job Queue (Redis + BullMQ)** - Stores jobs until worker picks them up
4. **Worker** - Background process that:
   - Picks up the job
   - Applies transformation (transform/filter/enrich/slack)
   - Delivers to all subscribers
   - Handles retries on failure
5. **Subscribers** - Endpoints that receive the processed data

---

### Key Design Decision - Why Async?

> "The critical design decision here is **asynchronous processing**. 

> When a webhook arrives, we immediately return HTTP 200 with 'queued' status. We don't wait for:
> - Database lookups for subscriber URLs
> - HTTP calls to deliver to each subscriber
> - Processing transformations

> This makes the system:
> - **Fast** - Client gets immediate response
> - **Resilient** - If worker crashes, jobs stay in queue
> - **Scalable** - Can add more workers without changing API"

---

## Part 2: Tech Stack (1-2 min)

### What to Show:
Quick slide or list of technologies used

### Talking Points:

> "Built with modern, production-ready technologies:

| Technology | Why Used |
|------------|----------|
| **Node.js 20** | Latest LTS, good performance |
| **TypeScript** | Type safety throughout - catches errors at compile time |
| **Express.js 5** | Minimal, flexible web framework |
| **Drizzle ORM** | Lightweight ORM - type-safe queries, no runtime overhead |
| **PostgreSQL 15** | Reliable relational database |
| **BullMQ + Redis** | Job queue with retry logic, persistence |
| **Docker + Compose** | One-command deployment |
| **JWT + bcrypt** | Secure authentication |
| **Rate Limiting** | Prevents abuse (100 req/15 min) |

> Each choice was made for **simplicity** and **reliability**."

---

## Part 3: Database Schema (1 min)

### What to Show:
Quick look at the schema file

### Talking Points:

> "The database has 4 simple tables:

```typescript
// pipelines - the core entity
pipelines: {
  id,              // UUID
  name,            // human-readable name
  webhookKey,      // unique key for webhook URL
  actionType,      // transform | filter | enrich | slack
  options,         // JSON - action-specific config
  createdAt
}

// subscribers - where to send processed data
subscribers: {
  id,
  pipelineId,      // foreign key
  url,             // destination URL
  createdAt
}

// jobs - tracks processing status
jobs: {
  id,
  pipelineId,
  payload,         // original webhook body
  status,          // pending | processing | completed | failed
  createdAt
}

// users - authentication
users: {
  id,
  email,
  password (hashed),
  createdAt
}
```

> Simple and normalized - each table has one responsibility."

---

## Part 4: Core Features - Processing Actions (2 min)

### What to Show:
Explain each action type with examples

### Talking Points:

> "The worker supports **4 processing actions**:

---

### 1. **Transform** - Modify the payload

Options:
- `uppercase` - Convert all string values to UPPERCASE
- `lowercase` - Convert all string values to lowercase  
- `compact` - Remove null, undefined, and empty string values

**Example:**
```json
// Input
{ "message": "Hello", "count": 5, "empty": null }

// Output (with uppercase)
{ "MESSAGE": "HELLO", "COUNT": 5 }
```

---

### 2. **Filter** - Keep specific fields

Options:
- `fields` - Array of field names to keep

**Example:**
```json
// Input
{ "id": 1, "name": "John", "email": "john@test.com", "password": "secret" }

// Output (with fields: ["id", "name"])
{ "id": 1, "name": "John" }
```

> Useful for privacy - filter out sensitive data before delivery.

---

### 3. **Enrich** - Add extra data

Options:
- Any key-value pairs to add to payload

**Example:**
```json
// Input
{ "event": "signup", "userId": 123 }

// Output (with options: { "source": "webhook-pipeline", "version": "1.0" })
{ 
  "event": "signup", 
  "userId": 123,
  "source": "webhook-pipeline",
  "version": "1.0",
  "_enriched": true,
  "_enrichedAt": "2026-03-24T12:00:00Z"
}
```

> Automatically adds timestamps and custom fields.

---

### 4. **Slack** - Format as Slack notification

Options:
- `title` - Notification title
- `emoji` - Emoji prefix (default: :incoming_envelope:)
- `color` - Attachment color (default: #36a64f)

**Example Output:**
Creates a Slack block with header, fields, and timestamp - ready to send to Slack Incoming Webhook.

---

## Part 5: Live Demo (4-5 min)

### Setup Before Recording:
```bash
# Terminal 1: Start services
docker compose up --build

# Terminal 2: Watch worker logs (optional)
docker compose logs -f worker
```

### Step 1: Register & Get Token (30 sec)

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "password123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "password123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

**Say:** "First, we register a user and get a JWT token. This token authenticates all subsequent API calls."

---

### Step 2: Create Pipeline (30 sec)

```bash
# Create pipeline with transform action
PIPELINE=$(curl -s -X POST http://localhost:3000/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Uppercase Pipeline", "actionType": "transform", "options": {"transformation": "uppercase"}}')

echo $PIPELINE | jq .

# Extract values
KEY=$(echo $PIPELINE | jq -r '.webhookKey')
PIPELINE_ID=$(echo $PIPELINE | jq -r '.pipeline.id')
WEBHOOK_URL="http://localhost:3000/webhooks/$KEY"

echo "Webhook URL: $WEBHOOK_URL"
```

**Say:** "We create a pipeline with transform action. The response gives us:
- A unique webhook key
- The full webhook URL
- The pipeline ID for later use"

---

### Step 3: Add Subscriber (30 sec)

```bash
# Add subscriber - use https://webhook.site/your-unique-id
curl -s -X POST "http://localhost:3000/subscribers/$PIPELINE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://webhook.site/YOUR-UNIQUE-ID"}'

# Verify
curl -s "http://localhost:3000/subscribers/$PIPELINE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Say:** "We add a subscriber. In production, this could be any HTTP endpoint. For testing, I'll use webhook.site so we can see the delivered payload."

---

### Step 4: Send Webhook (30 sec)

```bash
# Send webhook - this goes to the worker
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "data": {"name": "test", "city": "NYC"}}'

# Response
# {"status":"queued","jobId":"uuid-here","message":"Webhook received and queued for processing"}
```

**Say:** "We send a webhook. Key point: **immediate response**. Notice the status is 'queued', not 'processed'. The actual work happens in the background worker."

> **Optional:** Show worker logs here to see the job being picked up

---

### Step 5: Check Job Status (30 sec)

```bash
# List jobs
curl -s http://localhost:3000/jobs \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get specific job
JOB_ID="<job-id-from-above>"
curl -s "http://localhost:3000/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Say:** "We can query job status. It shows 'completed' with the original payload. The worker processed it and delivered to subscribers."

> **Optional:** Show what webhook.site received - the payload was transformed to uppercase!

---

### Step 6: Demo Different Actions (1 min)

#### Filter Action:
```bash
curl -s -X POST http://localhost:3000/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Filter Pipeline", "actionType": "filter", "options": {"fields": ["message", "status"]}}'
```

#### Enrich Action:
```bash
curl -s -X POST http://localhost:3000/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Enrich Pipeline", "actionType": "enrich", "options": {"source": "demo", "version": "1.0"}}'
```

**Say:** "Each action type works the same way - create pipeline, add subscriber, send webhook. The difference is in how the data is processed."

---

## Part 6: Design Decisions Deep Dive (2 min)

### What to Show:
Explain the "why" behind key technical choices

---

### Why Async Processing?

```
[Webhook Request] → [Fast Response] → [Queue] → [Worker] → [Subscribers]
         │                                     │
         └──────── 200 OK immediately ────────┘
```

**Benefits:**
- Sub-100ms response time regardless of subscriber count
- Worker can process 5 jobs concurrently
- Jobs persist in Redis - survive restarts
- Retry logic built-in (exponential backoff: 1s, 2s, 4s)

---

### Why BullMQ + Redis?

> "I chose BullMQ because:
> 1. **Reliability** - Jobs are persisted, survive crashes
> 2. **Retry Logic** - Exponential backoff built-in
> 3. **Concurrency** - Process multiple jobs simultaneously (set to 5)
> 4. **Visibility** - Job progress, completion, failure events
> 5. **Simplicity** - Clean API, good TypeScript types"

---

### Why Drizzle ORM?

> "Drizzle is:
> 1. **Type-safe** - Full TypeScript support, catches query errors
> 2. **Lightweight** - No runtime overhead, generates raw SQL
> 3. **Simple** - Migration tooling is straightforward
> 4. **Fast** - Direct PostgreSQL protocol, no ORM abstraction"

> "Compared to Prisma, it's more SQL-like and has less abstraction."

---

### Error Handling Strategy

> "The system handles failures gracefully:

1. **Job Level**: If pipeline not found or action fails → job marked as 'failed'
2. **Subscriber Level**: Each subscriber delivery is independent
   - If subscriber A fails, subscriber B still gets the data
   - Final job status: 'partial_failure' if any failed
3. **Retry Logic**: 
   - 3 attempts per subscriber
   - Exponential backoff: 5s, 10s, 15s delay between retries
4. **Logging**: All events logged (job picked up, completed, failed)"

---

### Security Measures

> "Security was a priority:
1. **Rate Limiting** - 100 requests per 15 minutes per IP
2. **Password Hashing** - bcrypt with 10 salt rounds
3. **JWT Tokens** - 24-hour expiration
4. **No Secrets in Code** - All via environment variables
5. **Input Validation** - TypeScript types + runtime checks"

---

## Part 7: Docker & Deployment (1 min)

### What to Show:
Demonstrate the Docker setup works

```bash
# Show it works with one command
docker compose down
docker compose up --build
```

**Say:** "The entire service deploys with one command. Docker Compose handles:
- Building both API and worker images
- Starting PostgreSQL, Redis
- Running migrations automatically
- Networking between services"

---

### Docker Entry Point (Technical Detail)

> "One tricky part: The worker shouldn't run migrations (they'd run twice - once for API, once for worker).

> Solution: I added a `SKIP_MIGRATIONS` environment variable. The entrypoint script checks this:
> - API: runs migrations on startup
> - Worker: skips migrations, assumes DB is ready"

---

## Part 8: CI/CD Pipeline (optional - if time)

### What to Show:
GitHub Actions workflow

```bash
# Show workflow file exists
ls -la .github/workflows/
```

**Say:** "The CI pipeline:
1. Runs on every push
2. Installs dependencies
3. Runs TypeScript type check
4. Runs linting (if configured)

This ensures code quality and catches errors before merge."

---

## Summary & Closing (30 sec)

> "That completes the walkthrough. 

> **To summarize what was built:**
> - Full CRUD API for pipeline management
> - Async webhook processing with BullMQ
> - 4 transformation types (transform, filter, enrich, slack)
> - Subscriber delivery with retry logic
> - Job status tracking
> - Docker deployment
> - Type-safe throughout with TypeScript

> The key things I learned:
> - How to decouple webhooks from processing with queues
> - Database design for async job systems
> - Docker multi-service orchestration

> Thank you. Happy to answer any questions!"

---

## Recording Tips

### Before Recording:
1. ✅ Practice all curl commands
2. ✅ Get a webhook.site URL ready
3. ✅ Test the full flow end-to-end
4. ✅ Have architecture diagram visible
5. ✅ Prepare terminal with syntax highlighting

### During Recording:
- Speak clearly and at moderate pace
- Don't rush - pause to emphasize key points
- Show the actual responses, not just commands
- Point to specific code if explaining implementation
- Keep each section within time budget

### Common Mistakes to Avoid:
- ❌ Forgetting to copy values from responses (jobId, pipelineId)
- ❌ Not using the token in subsequent requests
- ❌ Skipping the explanation of "why" - that's what they're evaluating
- ❌ Going too fast through the demo section

---

## Quick Reference - Commands

```bash
# Start
docker compose up --build

# Register & Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "password123"}' | jq -r '.token')

# Create Pipeline
curl -X POST http://localhost:3000/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "actionType": "transform", "options": {"transformation": "uppercase"}}'

# Add Subscriber
curl -X POST "http://localhost:3000/subscribers/<id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://webhook.site/your-id"}'

# Send Webhook
curl -X POST "http://localhost:3000/webhooks/<key>" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Check Jobs
curl http://localhost:3000/jobs \
  -H "Authorization: Bearer $TOKEN"
```
