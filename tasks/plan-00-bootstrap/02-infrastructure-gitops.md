# Infrastructure — GitOps Monorepo and ArgoCD

## Domain

infrastructure

## Plan

`plans/plan-00-bootstrap.md`

## Depends on

- `tasks/plan-00-bootstrap/00-backend-scaffold.md` — Docker image name and API container port confirmed
- `tasks/plan-00-bootstrap/01-frontend-scaffold.md` — Docker image name and web container port confirmed

## References

- `specs/infrastructure.md` — full Kubernetes manifest structure, resource specs, ArgoCD config, Traefik ingress rules
- `docs/architecture.md` — component map, external dependencies

## Context

Create the GitOps monorepo directory structure with Kustomize base manifests for all four Kubernetes components (Next.js web, Spring Boot API, PostgreSQL, MinIO), staging and production overlays, and ArgoCD Application manifests. No CI pipeline yet — that is task 03. The goal is a GitOps monorepo that ArgoCD can sync against, so that when task 03 pushes an image tag update the cluster picks it up automatically.

This task targets a **separate GitOps monorepo** (e.g. `tetra-gitops`) — not the application monorepo. Create the directory structure within the GitOps repo.

---

### Inlined spec excerpts

**GitOps monorepo structure:**

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
    kustomization.yaml         ← base kustomization
  overlays/
    staging/
      kustomization.yaml
      web-patch.yaml
      api-patch.yaml
      postgres-patch.yaml
      minio-patch.yaml
      sealed-secrets.yaml      ← placeholder (real secrets added before first deploy)
    production/
      kustomization.yaml
      web-patch.yaml
      api-patch.yaml
      postgres-patch.yaml
      minio-patch.yaml
      sealed-secrets.yaml      ← placeholder
  argocd/
    application-staging.yaml
    application-production.yaml
```

**Resource specifications:**

Web client (Next.js):
```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```
Replicas: 2 (production), 1 (staging)

API server (Spring Boot):
```yaml
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```
Replicas: 2 (production), 1 (staging)

PostgreSQL:
```yaml
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
replicas: 1
storage: 20Gi
storageClassName: hcloud-volumes
```

MinIO:
```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
replicas: 1
storage: 50Gi
storageClassName: hcloud-volumes
```

**Docker image names:**
- Web: `tetramobile/tetra-web:{git-sha}` (Docker Hub)
- API: `tetramobile/tetra-api:{git-sha}` (Docker Hub)

**Namespaces:** `tetra-staging`, `tetra-production`

**Domains:**
- Production: `tetra.tetramobile.ae`
- Staging: `staging.tetra.tetramobile.ae`

**Traefik ingress rules:**

| Path | Service | Port |
|------|---------|------|
| `/api/v1/` | `tetra-api-service` | 8080 |
| `/actuator/` | `tetra-api-service` | 8080 |
| `/` | `tetra-web-service` | 3000 |

Traefik annotations:
```yaml
kubernetes.io/ingress.class: traefik
traefik.ingress.kubernetes.io/router.tls: "true"
traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
```

**ArgoCD sync policy:** Automated with self-healing. Rollout timeout: 5 minutes. Auto-prune enabled.

---

## Implementation

### 1. Base manifests

**`apps/tetra/base/namespace.yaml`** — two Namespace objects: `tetra-staging` and `tetra-production`.

**`apps/tetra/base/web-deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tetra-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tetra-web
  template:
    metadata:
      labels:
        app: tetra-web
    spec:
      containers:
        - name: tetra-web
          image: tetramobile/tetra-web:latest   # overridden by overlay patch
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              valueFrom:
                configMapKeyRef:
                  name: tetra-web-config
                  key: NEXT_PUBLIC_API_URL
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
```

**`apps/tetra/base/web-service.yaml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: tetra-web-service
spec:
  selector:
    app: tetra-web
  ports:
    - port: 3000
      targetPort: 3000
```

**`apps/tetra/base/web-configmap.yaml`:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tetra-web-config
data:
  NEXT_PUBLIC_API_URL: ""   # overridden per environment overlay
```

**`apps/tetra/base/api-deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tetra-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tetra-api
  template:
    metadata:
      labels:
        app: tetra-api
    spec:
      containers:
        - name: tetra-api
          image: tetramobile/tetra-api:latest   # overridden by overlay patch
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              valueFrom:
                configMapKeyRef:
                  name: tetra-api-config
                  key: SPRING_PROFILES_ACTIVE
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                configMapKeyRef:
                  name: tetra-api-config
                  key: SPRING_DATASOURCE_URL
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                configMapKeyRef:
                  name: tetra-api-config
                  key: SPRING_DATASOURCE_USERNAME
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: POSTGRES_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: JWT_SECRET
            - name: MINIO_ENDPOINT
              valueFrom:
                configMapKeyRef:
                  name: tetra-api-config
                  key: MINIO_ENDPOINT
            - name: MINIO_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: MINIO_ROOT_USER
            - name: MINIO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: MINIO_ROOT_PASSWORD
            - name: MINIO_BUCKET
              valueFrom:
                configMapKeyRef:
                  name: tetra-api-config
                  key: MINIO_BUCKET
            - name: WHATSAPP_API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: WHATSAPP_API_TOKEN
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
```

**`apps/tetra/base/api-service.yaml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: tetra-api-service
spec:
  selector:
    app: tetra-api
  ports:
    - port: 8080
      targetPort: 8080
```

**`apps/tetra/base/api-configmap.yaml`:** ConfigMap with keys: `SPRING_PROFILES_ACTIVE`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `MINIO_ENDPOINT`, `MINIO_BUCKET` — values are empty strings, overridden per overlay.

**`apps/tetra/base/postgres-statefulset.yaml`:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tetra-postgres
spec:
  serviceName: tetra-postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: tetra-postgres
  template:
    metadata:
      labels:
        app: tetra-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: tetra
            - name: POSTGRES_USER
              value: tetra
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tetra-secrets
                  key: POSTGRES_PASSWORD
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: hcloud-volumes
        resources:
          requests:
            storage: 20Gi
```

**`apps/tetra/base/postgres-service.yaml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: tetra-postgres-service
spec:
  selector:
    app: tetra-postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None   # headless service for StatefulSet
```

**`apps/tetra/base/minio-statefulset.yaml`:** Same pattern as postgres StatefulSet. Image: `minio/minio:latest`. Command: `server /data --console-address ":9001"`. Env: `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from `tetra-secrets`. Port 9000 (API) + 9001 (console). PVC: 50Gi, `hcloud-volumes`. Resources: requests `100m`/`256Mi`, limits `500m`/`512Mi`.

**`apps/tetra/base/minio-service.yaml`:** Service exposing port 9000.

**`apps/tetra/base/ingress.yaml`:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tetra-ingress
  annotations:
    kubernetes.io/ingress.class: traefik
    traefik.ingress.kubernetes.io/router.tls: "true"
    traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
spec:
  rules:
    - host: ""   # overridden by overlay patch
      http:
        paths:
          - path: /api/v1
            pathType: Prefix
            backend:
              service:
                name: tetra-api-service
                port:
                  number: 8080
          - path: /actuator
            pathType: Prefix
            backend:
              service:
                name: tetra-api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tetra-web-service
                port:
                  number: 3000
```

**`apps/tetra/base/kustomization.yaml`:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - web-deployment.yaml
  - web-service.yaml
  - web-configmap.yaml
  - api-deployment.yaml
  - api-service.yaml
  - api-configmap.yaml
  - postgres-statefulset.yaml
  - postgres-service.yaml
  - minio-statefulset.yaml
  - minio-service.yaml
  - ingress.yaml
```

### 2. Staging overlay

**`apps/tetra/overlays/staging/kustomization.yaml`:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: tetra-staging
resources:
  - ../../base
  - sealed-secrets.yaml
patches:
  - path: web-patch.yaml
  - path: api-patch.yaml
images:
  - name: tetramobile/tetra-web
    newTag: latest   # CI pipeline updates this value
  - name: tetramobile/tetra-api
    newTag: latest
```

**`apps/tetra/overlays/staging/web-patch.yaml`:**
```yaml
- op: replace
  path: /spec/replicas
  value: 1
- op: replace
  path: /spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/name
  value: tetra-web-config
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tetra-web
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: tetra-web-config
data:
  NEXT_PUBLIC_API_URL: "https://staging.tetra.tetramobile.ae"
```

Write similar patches for API (replicas: 1, SPRING_PROFILES_ACTIVE: staging, correct DB URL pointing to postgres service, MinIO endpoint, MinIO bucket: `tetra-staging-attachments`), and an ingress patch setting `host: staging.tetra.tetramobile.ae`.

**`apps/tetra/overlays/staging/sealed-secrets.yaml`:** Placeholder file with a comment: `# Sealed secrets for tetra-staging — run kubeseal to populate before first deploy`. Do not commit real secret values.

### 3. Production overlay

Same structure as staging overlay. Differences:
- `namespace: tetra-production`
- `replicas: 2` for web and api (base values, no patch needed)
- ConfigMap values point to production domain and bucket names
- Ingress host: `tetra.tetramobile.ae`
- `SPRING_PROFILES_ACTIVE: production`
- MinIO bucket: `tetra-production-attachments`

### 4. ArgoCD Application manifests

**`apps/tetra/argocd/application-staging.yaml`:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: tetra-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/tetramobile/tetra-gitops.git
    targetRevision: main
    path: apps/tetra/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: tetra-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

**`apps/tetra/argocd/application-production.yaml`:** Same structure, name `tetra-production`, path `apps/tetra/overlays/production`, namespace `tetra-production`. No automated sync policy — production sync is triggered manually after staging validation (CI pipeline applies ArgoCD sync after manual approval gate).

### 5. Apply ArgoCD Applications

Apply both Application manifests to the cluster:
```bash
kubectl apply -f apps/tetra/argocd/application-staging.yaml
kubectl apply -f apps/tetra/argocd/application-production.yaml
```

Before first ArgoCD sync, populate `sealed-secrets.yaml` files for staging by running `kubeseal` against the cluster's public key for each required secret (POSTGRES_PASSWORD, JWT_SECRET, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, WHATSAPP_API_TOKEN). Leave production sealed-secrets as a placeholder until the production deploy.

---

## Acceptance criteria

- [ ] All YAML files are valid — `kubectl apply --dry-run=client -k apps/tetra/overlays/staging` exits 0
- [ ] `kubectl apply --dry-run=client -k apps/tetra/overlays/production` exits 0
- [ ] ArgoCD Application manifests are applied to the cluster — `kubectl get application -n argocd` shows `tetra-staging` and `tetra-production`
- [ ] ArgoCD shows `tetra-staging` as `Synced` after sealed secrets are populated and first deploy runs
- [ ] Kustomize overlay correctly sets namespace on all resources — `kubectl kustomize apps/tetra/overlays/staging | grep "namespace: tetra-staging"` returns matches
- [ ] Ingress host is `staging.tetra.tetramobile.ae` for staging overlay and `tetra.tetramobile.ae` for production overlay

## Automated checks

```bash
# Validate kustomize output (run from GitOps monorepo root)
kubectl kustomize apps/tetra/overlays/staging > /dev/null
# Expect: no errors

kubectl kustomize apps/tetra/overlays/production > /dev/null
# Expect: no errors

kubectl apply --dry-run=client -k apps/tetra/overlays/staging
# Expect: all resources "configured" or "created", exit 0

kubectl get application -n argocd tetra-staging -o jsonpath='{.status.sync.status}'
# Expect: Synced (after first deploy)
```
