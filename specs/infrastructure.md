# Infrastructure spec

Cluster: Hetzner · Kubernetes (kubeadm) · ArgoCD · GitHub Actions · Traefik · Sealed Secrets · Docker Hub

**Resolved open decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ingress controller | Traefik | Per project decision |
| Secrets management | Sealed Secrets | GitOps-native; no external dependency |
| Namespace strategy | One per environment | `tetra-staging`, `tetra-production` — clean isolation |
| Container registry | Docker Hub | Global default per `context/infrastructure.md` |
| ArgoCD sync policy | Automated with self-healing | Internal tool; automated rollout acceptable |
| Alert channel | Slack | Per project decision |

---

## Environments

---

### Local development

**Purpose:** Developer machines — run full stack locally for feature development
**Provisioning:** Manual — `docker compose up` in project root
**Namespace:** N/A (not Kubernetes)
**Domain:** `localhost:3000` (web), `localhost:8080` (API)
**Data strategy:** Synthetic data only — Docker Compose seeds a local PostgreSQL instance with test fixtures on startup
**Config differences from production:**
- `SPRING_PROFILES_ACTIVE` = `local` — disables WhatsApp dispatch, replaces with console log
- `JWT_SECRET` = hardcoded dev value — never used outside local
- MinIO runs in Docker Compose container — no cloud storage
- TLS disabled — plain HTTP on localhost
- Flyway runs migrations automatically on startup
- CORS allows `localhost:3000`

---

### Staging

**Purpose:** Pre-production validation — used by admin (Oscar) to verify changes before production promotion
**Provisioning:** Automated via GitHub Actions → GitOps monorepo → ArgoCD
**Namespace:** `tetra-staging`
**Domain:** `staging.tetra.tetramobile.ae` (web + API via path routing)
**Data strategy:** Synthetic data — a seeded dataset reflecting realistic volume without real customer PII
**Config differences from production:**
- `LOG_LEVEL` = `DEBUG` — verbose logging for debugging
- MinIO bucket = `tetra-staging-attachments` — isolated from production
- WhatsApp dispatch enabled but sends to a dedicated staging WhatsApp group, not real customer groups
- Replica count reduced (see Resource specifications)
- No backup job — staging data is disposable

---

### Production

**Purpose:** Live system — used by admin, company, and customer users
**Provisioning:** Automated via GitHub Actions → GitOps monorepo → ArgoCD, with manual approval gate before promotion from staging
**Namespace:** `tetra-production`
**Domain:** `tetra.tetramobile.ae` (web + API via path routing)
**Data strategy:** Real data — live customer records, phones, SIM cards, invoices
**Config differences from production:** N/A — this is the reference environment

---

## Hosting

| Component | Runs on | Replicas (prod) | Replicas (staging) |
|-----------|---------|----------------|-------------------|
| Web client (Next.js) | Kubernetes Deployment | 2 | 1 |
| API server (Spring Boot) | Kubernetes Deployment | 2 | 1 |
| PostgreSQL | Kubernetes StatefulSet | 1 | 1 |
| MinIO | Kubernetes StatefulSet | 1 | 1 |

> **Scale note:** Architecture defines ceiling of <100 customers, single region. No HPA configured — vertical scaling and replica count adjustments are the expected growth path. Revisit if customer count exceeds 100.

---

## Kubernetes manifests

**Location in GitOps monorepo:** `apps/tetra/`

**Structure:**
```
apps/tetra/
  base/
    namespace.yaml
    web-deployment.yaml
    web-service.yaml
    web-configmap.yaml
    api-deployment.yaml
    api-service.yaml
    api-configmap.yaml
    postgres-statefulset.yaml
    postgres-service.yaml
    postgres-pvc.yaml
    minio-statefulset.yaml
    minio-service.yaml
    minio-pvc.yaml
    ingress.yaml
  overlays/
    staging/
      kustomization.yaml
      web-patch.yaml          # replica count, image tag, env vars
      api-patch.yaml
      postgres-patch.yaml
      minio-patch.yaml
      sealed-secrets.yaml     # staging secrets
    production/
      kustomization.yaml
      web-patch.yaml
      api-patch.yaml
      postgres-patch.yaml
      minio-patch.yaml
      sealed-secrets.yaml     # production secrets
  argocd/
    application-staging.yaml
    application-production.yaml
```

**Tooling:** Kustomize — base manifests with environment overlays. Image tags updated in overlay patches by CI pipeline.

---

### Resource specifications

#### Web client (Next.js)

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
replicas: 2  # production
# staging: replicas: 1
```

No HPA — traffic is low and predictable for an internal operations tool.

---

#### API server (Spring Boot)

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
replicas: 2  # production
# staging: replicas: 1
```

JVM startup: Spring Boot 3 with GraalVM native image is not required at this scale. Use standard JVM with `-XX:MaxRAMPercentage=75.0` to keep heap within container memory limit.

No HPA — PDF generation is CPU-burst but infrequent (once/month per invoice). Two replicas provide availability, not throughput.

---

#### PostgreSQL

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
replicas: 1  # single primary, no read replicas at this scale
```

```yaml
# PersistentVolumeClaim
storage: 20Gi
storageClassName: hcloud-volumes  # Hetzner CSI driver
accessModes: [ReadWriteOnce]
```

---

#### MinIO

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
replicas: 1
```

```yaml
# PersistentVolumeClaim
storage: 50Gi
storageClassName: hcloud-volumes
accessModes: [ReadWriteOnce]
```

Object storage for request photo attachments. 50 Gi provides headroom for approximately 5,000 attachments at 10 MB max each. Expand PVC as needed.

---

## CI/CD pipeline

**CI tool:** GitHub Actions
**Trigger:** Push to `develop` triggers staging deploy. Manual approval gate on `main` triggers production deploy.

### Pipeline stages

```
1. Lint
   Frontend: pnpm lint  (ESLint + TypeScript type-check)
   Backend:  mvn checkstyle:check spotbugs:check

2. Test
   Frontend: pnpm test  (Vitest / Jest — unit tests)
   Backend:  mvn verify  (JUnit 5 unit + integration tests; @DataJpaTest against TestContainers PostgreSQL)
   Coverage threshold: 70% line coverage on backend service layer

3. Build
   Frontend: docker build → push to Docker Hub as
             tetramobile/tetra-web:{git-sha}
   Backend:  mvn spring-boot:build-image (Buildpacks) → push to Docker Hub as
             tetramobile/tetra-api:{git-sha}

4. Update GitOps manifests
   - sed or kustomize edit to update image tag in
     apps/tetra/overlays/{environment}/kustomization.yaml
   - git commit + push to GitOps monorepo
   - ArgoCD detects change, syncs within ~90 seconds

5. Smoke test (production only, after ArgoCD sync)
   - GET https://tetra.tetramobile.ae/api/v1/actuator/health → expect 200 {"status":"UP"}
   - GET https://tetra.tetramobile.ae/ → expect 200
   - Failure triggers rollback (see Rollback strategy)
```

### Rollback strategy

- **Automated:** ArgoCD self-healing is enabled — if a sync fails or pods do not become Ready within the rollout timeout (5 minutes), ArgoCD rolls back to the last known good state automatically.
- **Manual:** Revert the image tag commit in the GitOps monorepo on the `overlays/production/` path. ArgoCD detects the revert and syncs within ~90 seconds. No kubectl commands required.
- **Last resort:** `kubectl rollout undo deployment/tetra-api -n tetra-production` — bypasses GitOps but provides immediate relief. Must be followed by a manual GitOps sync to re-establish source of truth.

### Branch strategy

- `main` → production deploy — requires manual workflow approval gate in GitHub Actions
- `develop` → staging deploy — automatic on push, no approval gate
- Feature branches → CI only (lint + test) — no deploy
- PRs to `develop` or `main` require passing CI before merge
- Hotfixes: branch from `main`, merge to `main` and back-merge to `develop` after deploy

---

## Secrets management

**Tool:** Sealed Secrets (Bitnami)
**Strategy:** Secrets are encrypted locally using `kubeseal` with the cluster's public key. The encrypted `SealedSecret` YAML is committed to the GitOps monorepo. The Sealed Secrets controller decrypts in-cluster and creates native Kubernetes `Secret` objects. No plaintext secret ever touches Git.

Sealed secrets are environment-scoped — a secret sealed for `tetra-staging` cannot be decrypted in `tetra-production`.

### Secrets inventory

| Secret name | Used by | Storage location | Rotation strategy |
|-------------|---------|-----------------|------------------|
| `POSTGRES_PASSWORD` | PostgreSQL + API server | `apps/tetra/overlays/{env}/sealed-secrets.yaml` | Manual — re-seal and commit |
| `JWT_SECRET` | API server | `apps/tetra/overlays/{env}/sealed-secrets.yaml` | Manual — rotate every 6 months; existing sessions invalidated on rotation |
| `MINIO_ROOT_USER` | MinIO + API server | `apps/tetra/overlays/{env}/sealed-secrets.yaml` | Manual |
| `MINIO_ROOT_PASSWORD` | MinIO + API server | `apps/tetra/overlays/{env}/sealed-secrets.yaml` | Manual |
| `WHATSAPP_API_TOKEN` | API server | `apps/tetra/overlays/{env}/sealed-secrets.yaml` | Manual — rotate when Meta token expires |
| `DOCKERHUB_USERNAME` | GitHub Actions | GitHub repository secret | Manual |
| `DOCKERHUB_TOKEN` | GitHub Actions | GitHub repository secret | Manual |
| `GITOPS_DEPLOY_KEY` | GitHub Actions | GitHub repository secret | Manual — SSH key for GitOps monorepo write access |
| `KUBESEAL_PUBLIC_KEY` | Developer machines | Committed to project repo (not sensitive — public key only) | Automatic on Sealed Secrets controller cert rotation |

### Access pattern

Pods access secrets as Kubernetes `Secret` references mounted as environment variables. API server `Deployment` references secret keys via `valueFrom.secretKeyRef`. No init container or Vault sidecar required.

```yaml
env:
  - name: POSTGRES_PASSWORD
    valueFrom:
      secretKeyRef:
        name: tetra-secrets
        key: POSTGRES_PASSWORD
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: tetra-secrets
        key: JWT_SECRET
```

---

## Ingress

**Ingress controller:** Traefik (deployed cluster-wide)
**TLS:** cert-manager with Let's Encrypt ACME (HTTP-01 challenge)

### Ingress rules

All traffic enters via a single domain. Path-based routing keeps the app and API on the same origin, which is required for SameSite=Strict cookies to work correctly.

| Host | Path | Service | Port |
|------|------|---------|------|
| `tetra.tetramobile.ae` | `/api/v1/` | `tetra-api-service` | 8080 |
| `tetra.tetramobile.ae` | `/actuator/` | `tetra-api-service` | 8080 |
| `tetra.tetramobile.ae` | `/` | `tetra-web-service` | 3000 |
| `staging.tetra.tetramobile.ae` | `/api/v1/` | `tetra-api-service` (staging) | 8080 |
| `staging.tetra.tetramobile.ae` | `/` | `tetra-web-service` (staging) | 3000 |

**Traefik annotations on Ingress:**
```yaml
kubernetes.io/ingress.class: traefik
traefik.ingress.kubernetes.io/router.tls: "true"
traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
```

**Security headers middleware** (defined as Traefik Middleware resource):
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Scaling strategy

**Current scale assumptions:** Single region, <100 customers. Expected concurrent users: <20 at peak. No horizontal auto-scaling built in for MVP.

**Scaling approach per component:**

- **Web client:** Horizontal — increase `replicas` in overlay patch. Next.js stateless, scales linearly. Trigger: p99 latency > 2s or CPU consistently > 70%.
- **API server:** Horizontal — increase `replicas`. Stateless beyond httpOnly cookies (which are client-side). Trigger: CPU consistently > 70% or memory consistently > 80%. PDF generation is the only CPU spike — one invoice/month, tolerable on 2 replicas.
- **PostgreSQL:** Vertical first (increase memory/CPU limits) then add read replica if read-heavy reporting grows. No read replicas at MVP scale. Trigger: DB connection pool exhaustion or query latency > 500ms p99.
- **MinIO:** Vertical — increase PVC size as attachment volume grows. No distributed MinIO needed below 1 TB.

**Scale ceiling:** Architecture is designed for <100 customers. If customer count exceeds 100 or concurrent users exceed 50, revisit: add read replica for PostgreSQL, introduce a CDN for Next.js static assets, configure HPA on API server.

---

## Observability

**Metrics:**
- Collection: Prometheus scraping `GET /actuator/prometheus` on the API server pod (Spring Boot Micrometer auto-config). Traefik exposes metrics on its own metrics endpoint.
- Storage: Prometheus deployed on cluster with 15-day retention. Grafana for dashboards.
- Key dashboards:
  - HTTP request rate, error rate (5xx %), latency (p50/p95/p99) — per endpoint
  - JVM: heap usage, GC pause time, thread count
  - DB connection pool: active connections, pending acquisitions, pool size (HikariCP via Micrometer)
  - MinIO: object count, storage used, request latency
  - Pod restarts and resource utilization

**Logging:**
- Aggregation: Grafana Loki — log shipping via Promtail DaemonSet on cluster nodes
- Retention: staging 7 days, production 30 days
- Log format: structured JSON (Spring Boot configured with `logback-spring.xml` to output JSON; Next.js logs formatted as JSON via `pino`)
- Log levels: production `INFO` (API server), staging `DEBUG`. Never log passwords, tokens, IBAN, or WhatsApp group IDs (see `specs/backend.md` Logging strategy).

**Alerting:**
- Channel: Slack `#tetra-alerts` channel via Alertmanager → Slack webhook
- Rules:

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| High 5xx rate | 5xx rate > 1% for 5 minutes | critical | `#tetra-alerts` |
| Pod crash loop | Pod restarting > 3 times in 10 minutes | critical | `#tetra-alerts` |
| API high latency | p99 latency > 3000ms for 5 minutes | warning | `#tetra-alerts` |
| DB pool exhaustion | HikariCP pending acquisitions > 5 for 2 minutes | warning | `#tetra-alerts` |
| Low disk — Postgres PV | PV usage > 80% | warning | `#tetra-alerts` |
| Low disk — MinIO PV | PV usage > 75% | warning | `#tetra-alerts` |
| Certificate expiry | TLS cert expires in < 14 days | warning | `#tetra-alerts` |
| ArgoCD sync failed | ArgoCD Application `Degraded` for > 10 minutes | critical | `#tetra-alerts` |
| WhatsApp dispatch failures | `whatsapp_dispatch_failures_total` > 5 in 10 minutes | warning | `#tetra-alerts` |

**Distributed tracing:** Not implemented for MVP. Deferred — add OpenTelemetry + Tempo if debugging cross-service latency becomes necessary.

---

## Disaster recovery

**Backup strategy:**
- **Database:** `pg_dump` CronJob (`0 3 * * *` — daily at 03:00 UTC) dumps compressed SQL to a dedicated MinIO bucket `tetra-backups`. Retention: 30 days (automated lifecycle rule in MinIO). Backup bucket is physically separate from the attachments bucket.
- **MinIO attachments:** CronJob (`0 4 * * *`) syncs MinIO objects to Hetzner Object Storage (S3-compatible) using `mc mirror`. Retention: 30 days. Provides off-cluster copy of all request photo attachments.
- **Sealed secrets encryption key:** Sealed Secrets controller private key must be backed up separately. Store encrypted copy in Hetzner Object Storage. Rotate backup on controller cert renewal (annual).

**RTO (Recovery Time Objective):** 4 hours — internal operations tool, not revenue-blocking in short outages. Targeting manual recovery within a business day.

**RPO (Recovery Point Objective):** 24 hours — daily backups acceptable. Invoice data is the most critical; invoices are generated monthly and their computed fields are stored (not re-derived), so a 24-hour loss window is tolerable.

**Recovery runbook location:** `docs/runbooks/disaster-recovery.md` (to be written during implementation)

**Recovery procedure summary:**
1. Provision fresh namespace or cluster if needed
2. Restore Sealed Secrets controller private key to new cluster
3. Apply GitOps manifests via ArgoCD (sealed secrets decrypt automatically)
4. Restore PostgreSQL from latest `pg_dump` backup: `pg_restore -d tetra_prod backup.sql`
5. Restore MinIO attachments from Hetzner Object Storage mirror
6. Verify with smoke test: `GET /api/v1/actuator/health`
