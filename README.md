# 🃏 UNO Multiplayer — Real-Time 8-Player Game on AWS EC2

> **Built because no free 8-player UNO game exists online.** This project fills that gap while serving as a hands-on learning platform for three-tier containerized application deployment on AWS — covering Docker multi-container orchestration, real-time WebSocket communication, MongoDB persistence, DockerHub image registry, and a fully automated GitHub Actions CI/CD pipeline that deploys directly to a live EC2 instance on every push.

---

## 🎯 What I Was Trying to Learn

- How to architect a **three-tier application** — separate client, server, and database containers
- How **real-time communication** works across 8 simultaneous players (Socket.io / WebSockets)
- How to manage **game state in MongoDB** with persistent Docker volumes
- How to write a **Docker Compose** file that orchestrates multi-service apps with proper dependencies
- How to build, tag, and push **Docker images to DockerHub** from a CI/CD pipeline
- How to **automate deployment to AWS EC2** via SSH using GitHub Actions secrets — zero manual steps
- How to handle **secrets securely** — never hardcoded, always via GitHub repository secrets

---

## 🏛️ Architecture

```
Internet (Up to 8 Players)
         │
         ▼
  [AWS EC2 Instance — Ubuntu Server]
         │
         ├─── [Client Container]      :80    ← React UI (served via nginx)
         │            │
         │            │ HTTP / WebSocket
         │            ▼
         ├─── [Server Container]      :3002  ← Node.js + Express + Socket.io
         │            │
         │            │ MongoDB connection string
         │            ▼
         └─── [MongoDB Container]     :27017 ← Game state & player data
                      │
                      └── [mongodb_data volume] ← Persists across restarts
```

**Key design decisions:**
- Client never talks to MongoDB directly — all data flows through the server
- `depends_on` enforces startup order: MongoDB → Server → Client
- `restart: always` ensures all containers auto-recover after EC2 reboots or crashes
- MongoDB exposed only within the Docker network — port 27017 not open to the internet
- Named Docker volume `mongodb_data` ensures game data survives container restarts

---

## ⚙️ CI/CD Pipeline — Fully Automated Deploy on Push

Every `git push` to `main` triggers the full pipeline with **zero manual steps**:

```
git push to main
      │
      ▼
GitHub Actions triggers
      │
      ├── 1. Checkout code
      │
      ├── 2. Build Docker images
      │         ├── hebrusrobin/uno-server:latest
      │         └── hebrusrobin/uno-client:latest
      │
      ├── 3. Push images to DockerHub
      │         └── Authenticated via:
      │               DOCKER_USERNAME (secret)
      │               DOCKER_PASSWORD (secret)
      │
      └── 4. SSH into AWS EC2 and deploy
                └── Authenticated via:
                      EC2_HOST     (secret)
                      EC2_USER     (secret)
                      EC2_SSH_KEY  (secret)
                           │
                           ├── docker-compose pull
                           └── docker-compose up -d
```

**All credentials stored as GitHub Repository Secrets — never hardcoded in code.**

---

## 🔐 Secrets Management

| Secret | Purpose |
|---|---|
| `DOCKER_USERNAME` | DockerHub login for image push |
| `DOCKER_PASSWORD` | DockerHub login for image push |
| `EC2_HOST` | Public IP of the AWS EC2 instance |
| `EC2_USER` | SSH username (`ubuntu`) |
| `EC2_SSH_KEY` | Private PEM key for SSH authentication into EC2 |

This follows the same secrets management pattern used in production DevOps environments — credentials injected at runtime, never stored in the repository.

---

## 📁 File Structure

```
UNO/
├── client/                    # React frontend
│   ├── src/                   # Game UI, card components, player hand
│   └── Dockerfile             # Builds nginx-served React app
│
├── server/                    # Node.js backend
│   ├── index.js               # Express + Socket.io server entry point
│   ├── game logic/            # UNO rules engine, turn management
│   └── Dockerfile             # Builds the Node.js server container
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # Full CI/CD: build → push → SSH deploy
│
└── docker-compose.yml         # Orchestrates client + server + MongoDB
```

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + CSS | Game UI, player hand, card rendering |
| Backend | Node.js + Express | Game logic, API, player session management |
| Real-time | Socket.io | Live card plays and turn sync across all 8 players |
| Database | MongoDB | Game state, room data, player persistence |
| Containerization | Docker + Docker Compose | Multi-service orchestration |
| Image Registry | DockerHub | `hebrusrobin/uno-server` · `hebrusrobin/uno-client` |
| Cloud | AWS EC2 (Ubuntu) | Production deployment, internet-accessible |
| CI/CD | GitHub Actions | Automated build → push → SSH deploy pipeline |
| Secrets | GitHub Repository Secrets | Secure credential injection, never hardcoded |

---

## ☁️ AWS EC2 Deployment

The application runs on an AWS EC2 Ubuntu instance and is publicly accessible from the internet.

**EC2 Security Group rules configured:**

| Port | Access | Reason |
|---|---|---|
| 80 | `0.0.0.0/0` | Public web access for players |
| 3002 | Internal | Client-to-server WebSocket communication |
| 27017 | Restricted | MongoDB — internal Docker network only |
| 22 | Trusted IP | SSH for deployment pipeline |

**Manual first-time EC2 setup:**
```bash
# SSH into EC2
ssh -i key.pem ubuntu@<ec2-public-ip>

# Install Docker and Docker Compose
sudo apt update && sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Clone and start
git clone https://github.com/Robin-hr/UNO.git
cd UNO
docker-compose up -d
```

After this, all future deployments are **fully automated via GitHub Actions** — no manual SSH needed.

---

## 🚀 How to Run Locally

```bash
# Clone the repo
git clone https://github.com/Robin-hr/UNO.git
cd UNO

# Start all 3 containers
docker-compose up -d

# Verify containers are running
docker ps

# Open in browser
http://localhost
```

To stop all containers:
```bash
docker-compose down
```

To stop and wipe the MongoDB volume (reset all game data):
```bash
docker-compose down -v
```

---

## 🎮 Game Features

- Up to **8 simultaneous players** in a single game room
- **Real-time** card play updates across all players via WebSockets
- Full UNO rules: Skip, Reverse, Draw Two, Wild, Wild Draw Four
- **Game state persisted in MongoDB** — handles player reconnections
- Live turn indicators and player hand management
- Room-based multiplayer — multiple games can run in parallel

---

## 💡 What I Learned

- **Docker Compose service networking** — containers communicate by service name, not `localhost`. The server connects to MongoDB via `mongodb://mongodb:27017` — a key mental model that doesn't apply to local development.
- **`depends_on` vs true readiness** — `depends_on` only controls start order, not whether the service is actually ready to accept connections. MongoDB needs a few seconds after start; the server needs retry logic to handle this gracefully.
- **Named volumes for persistence** — without `mongodb_data:/data/db`, all game data is lost every time the container stops. Named volumes decouple data lifecycle from container lifecycle.
- **GitHub Actions secrets for SSH deployment** — injecting `EC2_SSH_KEY` as a secret and using it to SSH into a live server from a pipeline is the same pattern used in production CI/CD at real companies.
- **EC2 Security Groups as network firewall** — only exposing necessary ports (80 for players, 22 for deployment) and keeping MongoDB port internal mirrors least-privilege network design.
- **DockerHub as a deployment artifact store** — the pipeline builds → pushes to DockerHub → EC2 pulls from DockerHub. This means EC2 never needs the source code directly, only the built image.

---

## 🔭 What I'd Add Next (Enhancements Planned)

- [ ] Move from single EC2 to **AWS ECS** for managed container orchestration and auto-scaling
- [ ] Add **ALB (Application Load Balancer)** for SSL/TLS termination and health-check routing
- [ ] Replace self-hosted MongoDB container with **MongoDB Atlas** — removes database as a single point of failure
- [ ] Move EC2 credentials from GitHub Secrets to **AWS Secrets Manager + IAM roles** (OIDC federation)
- [ ] Add **Trivy container scanning** in the pipeline — flag vulnerabilities in base images before push
- [ ] Add **CloudWatch monitoring** — CPU, memory, and WebSocket connection count dashboards on EC2
- [ ] Use **Terraform** to provision EC2, Security Groups, and VPC instead of manual AWS Console setup
- [ ] Add **game room expiry** via MongoDB TTL indexes to clean up abandoned sessions automatically

---

## 🐳 DockerHub Images

```bash
docker pull hebrusrobin/uno-server:latest
docker pull hebrusrobin/uno-client:latest
```

---

## 📌 Status

> ✅ **Live on AWS EC2** — all 3 containers running via Docker Compose.
> ✅ **CI/CD active** — every push to `main` auto-builds, pushes to DockerHub, and deploys to EC2.
> ✅ **Publicly accessible** — open to the internet on port 80.

---

## 👤 Author

**Hebrus Robin** — AWS Certified Solutions Architect (SAA-C03)
- LinkedIn: [linkedin.com/in/hebrus-robin](https://linkedin.com/in/hebrus-robin)
- GitHub: [github.com/Robin-hr](https://github.com/Robin-hr)
- DockerHub: [hub.docker.com/u/hebrusrobin](https://hub.docker.com/u/hebrusrobin)
