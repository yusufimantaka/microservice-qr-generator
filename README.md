# Microservice QR Generator

A QR code generation platform built with a microservice architecture.

## Architecture

```
Browser / Next.js Frontend
        │
        ▼
  ┌─────────────┐   port 8080
  │ API Gateway │  (Nginx — routing + rate limiting)
  └──────┬──────┘
         │
  ┌──────┼──────────────────────────┐
  ▼      ▼           ▼              ▼
QR     Auth      History        Batch API
Gen   Service    Service        Service
:5000  :5001      :5002          :5003
  │      │           │              │
  └──────┴─────┬─────┘              │
               ▼                    ▼
           Redis :6379          Kafka :9092
           Mongo :27017             │
                                    ▼
                               Worker Service
```

## Services

| Service | Port | Description |
|---|---|---|
| **API Gateway** | 8080 | Nginx — request routing and per-endpoint rate limiting |
| **QR Generator** | 5000 | Generates QR code PNGs; Redis cache (7-day TTL) |
| **Auth Service** | 5001 | JWT registration, login, logout, token verification |
| **User History** | 5002 | Stores generation history via Kafka consumer; MongoDB |
| **Batch API** | 5003 | Accepts bulk QR requests; tracks progress via Redis |
| **Worker** | — | Consumes `qr-generation` topic; generates + caches QRs |

## Rate Limits (API Gateway)

| Endpoint pattern | Limit |
|---|---|
| `/api/v1/auth/*` | 10 req/min per IP (burst 5) |
| `/api/v1/qr/generate` | 30 req/min per IP (burst 10) |
| `/api/v1/batch/*` | 5 req/min per IP (burst 3) |
| `/api/v1/history*` | 60 req/min per IP (burst 20) |

## Kafka Topics

| Topic | Producer | Consumer |
|---|---|---|
| `qr-generation` | Batch API | Worker Service |
| `qr-history` | QR Generator, Worker | User History Service |

## API Reference

### Auth Service
```
POST /api/v1/auth/register   { username, email, password }
POST /api/v1/auth/login      { username, password }
POST /api/v1/auth/logout     Authorization: Bearer <token>
GET  /api/v1/auth/me         Authorization: Bearer <token>
GET  /api/v1/auth/verify     Authorization: Bearer <token>  (internal)
```

### QR Generator
```
POST /api/v1/generate        { text, fill_color?, back_color?, user_id? }
```

### User History
```
GET /api/v1/history          ?user_id=&page=&limit=
GET /api/v1/history/stats    ?user_id=
```

### Batch API
```
POST   /api/v1/batch/generate          { user_id, items: [{text, fill_color?, back_color?}] }
GET    /api/v1/batch/status/<batch_id>
DELETE /api/v1/batch/cancel/<batch_id>
```

## Quick Start

```bash
# Copy and configure environment variables
cp .env.example .env

# Start all services
docker compose up --build

# Frontend (development)
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT signing — **change this** |
| `JWT_EXPIRY_HOURS` | `24` | Token validity in hours |
| `MAX_BATCH_SIZE` | `100` | Max items per batch request |
| `QR_SERVICE_URL` | `http://localhost:5000` | Next.js → QR service |
| `AUTH_SERVICE_URL` | `http://localhost:5001` | Next.js → Auth service |
| `HISTORY_SERVICE_URL` | `http://localhost:5002` | Next.js → History service |
| `BATCH_SERVICE_URL` | `http://localhost:5003` | Next.js → Batch service |
