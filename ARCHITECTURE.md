# PulsePing Architecture

```mermaid
graph TB
    subgraph "Frontend"
        D[Dashboard<br/>Next.js]
    end
    
    subgraph "API Gateway"
        API[API Service<br/>Fastify<br/>:3000]
    end
    
    subgraph "Worker Service"
        W[Worker Service<br/>SQS Consumer]
    end
    
    subgraph "Shared Lib"
        L[Pino Logger]
        Q[SQS Queue]
        C[Config/Zod]
        DB[Prisma Client]
        UT[Utils]
    end
    
    subgraph "Observability"
        LK[Loki<br/>:3100]
        PL[Promtail]
        GF[Grafana<br/>:3001]
    end
    
    subgraph "Infrastructure"
        SQS[AWS SQS<br/>LocalStack]
        PG[(PostgreSQL)]
        R[Resend]
        CL[Clerk]
    end
    
    D -->|HTTP| API
    API --> L
    API --> Q
    API --> C
    API --> DB
    
    API -->|Enqueue Jobs| SQS
    SQS -->|Dequeue Jobs| W
    
    D -->|Auth| CL
    
    L -.->|JSON Logs| PL
    W -.->|JSON Logs| PL
    PL -->|Scrape| LK
    LK -->|Query| GF
    
    DB --> PG
    
    style D fill:#61dafb,color:#000
    style API fill:#007,color:#fff
    style W fill:#90EE90,color:#000
    style GF fill:#FF4785,color:#fff
    style LK fill:#FFA656,color:#000
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API | 3000 | Fastify REST API |
| Worker | - | Background job processor |
| Dashboard | 3001 (Next.js) | Web UI |
| Grafana | 3001 | Log visualization |
| Loki | 3100 | Log aggregation |
| PostgreSQL | 5432 | Database |
| LocalStack | 4566 | SQS mock |

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Open Grafana
# http://localhost:3001
# Username: admin
# Password: admin
```

## Environment Variables

See `.env.example` for configuration.