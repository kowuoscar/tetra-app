# Infrastructure — GitHub Actions CI/CD Pipeline

## Domain

infrastructure

## Plan

`plans/plan-00-bootstrap.md`

## Depends on

- `tasks/plan-00-bootstrap/02-infrastructure-gitops.md` — GitOps monorepo structure must exist; CI pushes image tag updates to it

## References

- `specs/infrastructure.md#cicd-pipeline` — pipeline stages, branch strategy, rollback strategy
- `specs/infrastructure.md#secrets-management` — GitHub repository secrets required

## Context

Create the GitHub Actions workflow files that implement the full CI/CD pipeline: lint → test → build Docker images → push to Docker Hub → update image tags in the GitOps monorepo → ArgoCD sync (staging auto, production with manual approval gate). The pipeline runs on every push and PR but only deploys from `develop` (staging) and `main` (production). No new application code — only `.github/workflows/` YAML files in the application monorepo.

---

### Inlined spec excerpts

**Pipeline stages:**

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
   Backend:  mvn package -DskipTests → docker build → push to Docker Hub as
             tetramobile/tetra-api:{git-sha}

4. Update GitOps manifests
   - kustomize edit to update image tag in
     apps/tetra/overlays/{environment}/kustomization.yaml
   - git commit + push to GitOps monorepo
   - ArgoCD detects change, syncs within ~90 seconds

5. Smoke test (production only, after ArgoCD sync)
   - GET https://tetra.tetramobile.ae/api/v1/actuator/health → expect 200 {"status":"UP"}
   - GET https://tetra.tetramobile.ae/ → expect 200
```

**Branch strategy:**
- `main` → production deploy — requires manual workflow approval gate in GitHub Actions (environment: `production`)
- `develop` → staging deploy — automatic on push, no approval gate
- Feature branches → CI only (lint + test) — no deploy
- PRs to `develop` or `main` → CI only (lint + test) — no deploy

**Required GitHub repository secrets:**
- `DOCKERHUB_USERNAME` — Docker Hub login
- `DOCKERHUB_TOKEN` — Docker Hub access token
- `GITOPS_DEPLOY_KEY` — SSH private key with write access to the GitOps monorepo

**Docker image names:**
- `tetramobile/tetra-web:{git-sha}`
- `tetramobile/tetra-api:{git-sha}`

**GitOps monorepo:** SSH URL — `git@github.com:tetramobile/tetra-gitops.git`

**Kustomize image tag update command:**
```bash
cd apps/tetra/overlays/staging
kustomize edit set image tetramobile/tetra-web=tetramobile/tetra-web:${GIT_SHA}
kustomize edit set image tetramobile/tetra-api=tetramobile/tetra-api:${GIT_SHA}
git add kustomization.yaml
git commit -m "ci: update image tags to ${GIT_SHA}"
git push
```

---

## Implementation

Create two workflow files in `.github/workflows/` in the application monorepo:

### 1. `.github/workflows/ci.yml` — runs on every push and PR (lint + test only)

```yaml
name: CI

on:
  push:
    branches-ignore:
      - main
      - develop
  pull_request:
    branches:
      - develop
      - main

jobs:
  lint-frontend:
    name: Lint Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - name: Install dependencies
        run: cd web && pnpm install --frozen-lockfile
      - name: Lint
        run: cd web && pnpm lint
      - name: Type check
        run: cd web && pnpm tsc --noEmit

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    needs: lint-frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - name: Install dependencies
        run: cd web && pnpm install --frozen-lockfile
      - name: Test
        run: cd web && pnpm test --passWithNoTests

  lint-backend:
    name: Lint Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven
      - name: Checkstyle + SpotBugs
        run: cd api && ./mvnw checkstyle:check spotbugs:check -q

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest
    needs: lint-backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven
      - name: Test
        run: cd api && ./mvnw verify -q
```

### 2. `.github/workflows/deploy.yml` — runs on push to `develop` or `main` only

```yaml
name: Deploy

on:
  push:
    branches:
      - develop
      - main

env:
  GIT_SHA: ${{ github.sha }}

jobs:
  lint-frontend:
    name: Lint Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - run: cd web && pnpm install --frozen-lockfile
      - run: cd web && pnpm lint
      - run: cd web && pnpm tsc --noEmit

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    needs: lint-frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - run: cd web && pnpm install --frozen-lockfile
      - run: cd web && pnpm test --passWithNoTests

  lint-backend:
    name: Lint Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven
      - run: cd api && ./mvnw checkstyle:check spotbugs:check -q

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest
    needs: lint-backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven
      - run: cd api && ./mvnw verify -q

  build-and-push:
    name: Build & Push Docker Images
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend]
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push web image
        uses: docker/build-push-action@v6
        with:
          context: ./web
          push: true
          tags: tetramobile/tetra-web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build API jar
        uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven
      - run: cd api && ./mvnw package -DskipTests -q

      - name: Build and push API image
        uses: docker/build-push-action@v6
        with:
          context: ./api
          push: true
          tags: tetramobile/tetra-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Configure SSH for GitOps monorepo
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.GITOPS_DEPLOY_KEY }}" > ~/.ssh/gitops_key
          chmod 600 ~/.ssh/gitops_key
          ssh-keyscan github.com >> ~/.ssh/known_hosts
          cat >> ~/.ssh/config <<EOF
          Host github.com
            IdentityFile ~/.ssh/gitops_key
            StrictHostKeyChecking yes
          EOF

      - name: Clone GitOps monorepo
        run: git clone git@github.com:tetramobile/tetra-gitops.git gitops

      - name: Update staging image tags
        run: |
          cd gitops
          git config user.email "ci@tetramobile.ae"
          git config user.name "Tetra CI"
          cd apps/tetra/overlays/staging
          kustomize edit set image tetramobile/tetra-web=tetramobile/tetra-web:${{ github.sha }}
          kustomize edit set image tetramobile/tetra-api=tetramobile/tetra-api:${{ github.sha }}
          git add kustomization.yaml
          git commit -m "ci: deploy ${{ github.sha }} to staging"
          git push

      - name: Wait for ArgoCD sync
        run: sleep 120   # ArgoCD detects GitOps change within ~90 seconds

      - name: Smoke test staging
        run: |
          curl -f https://staging.tetra.tetramobile.ae/api/v1/actuator/health
          curl -f https://staging.tetra.tetramobile.ae/

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production   # GitHub Actions environment with manual approval gate
    steps:
      - name: Configure SSH for GitOps monorepo
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.GITOPS_DEPLOY_KEY }}" > ~/.ssh/gitops_key
          chmod 600 ~/.ssh/gitops_key
          ssh-keyscan github.com >> ~/.ssh/known_hosts
          cat >> ~/.ssh/config <<EOF
          Host github.com
            IdentityFile ~/.ssh/gitops_key
            StrictHostKeyChecking yes
          EOF

      - name: Clone GitOps monorepo
        run: git clone git@github.com:tetramobile/tetra-gitops.git gitops

      - name: Update production image tags
        run: |
          cd gitops
          git config user.email "ci@tetramobile.ae"
          git config user.name "Tetra CI"
          cd apps/tetra/overlays/production
          kustomize edit set image tetramobile/tetra-web=tetramobile/tetra-web:${{ github.sha }}
          kustomize edit set image tetramobile/tetra-api=tetramobile/tetra-api:${{ github.sha }}
          git add kustomization.yaml
          git commit -m "ci: deploy ${{ github.sha }} to production"
          git push

      - name: Wait for ArgoCD sync
        run: sleep 120

      - name: Smoke test production
        run: |
          curl -f https://tetra.tetramobile.ae/api/v1/actuator/health
          curl -f https://tetra.tetramobile.ae/
```

### 3. Configure GitHub Actions environment

In the GitHub repository settings:
- Create an environment named `production`
- Add a required reviewer (Oscar's GitHub account)
- This gates the `deploy-production` job behind a manual approval step

### 4. Add Checkstyle and SpotBugs to pom.xml

Add plugin configuration to `api/pom.xml` build section:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.4.0</version>
  <configuration>
    <configLocation>google_checks.xml</configLocation>
    <failsOnError>true</failsOnError>
    <consoleOutput>true</consoleOutput>
  </configuration>
</plugin>
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <version>4.8.6.2</version>
  <configuration>
    <effort>Max</effort>
    <threshold>High</threshold>
  </configuration>
</plugin>
```

Create `api/checkstyle-suppressions.xml` to suppress generated code directories if needed.

Add `pnpm lint` script to `web/package.json`:
```json
"scripts": {
  "lint": "next lint",
  "test": "vitest run",
  "build": "next build"
}
```

Add Vitest as the test runner (plan-01 will add actual tests; this task just wires the runner):
```bash
cd web && pnpm add -D vitest @vitejs/plugin-react
```

---

## Acceptance criteria

- [ ] Push to any feature branch triggers `ci.yml` — lint and test jobs run, no deploy
- [ ] PR to `develop` triggers `ci.yml` — lint and test jobs run, no deploy
- [ ] Push to `develop` triggers `deploy.yml` — full pipeline runs; staging is updated with new image tags; smoke test passes
- [ ] Push to `main` triggers `deploy.yml` — `deploy-production` job is gated behind manual approval; after approval, production is updated and smoke test passes
- [ ] `ci.yml` and `deploy.yml` pass with green status on first push to `develop` after plan-00 is complete
- [ ] GitOps monorepo `overlays/staging/kustomization.yaml` shows the commit SHA image tag after a staging deploy

## Automated checks

```bash
# Validate GitHub Actions YAML syntax (install actionlint)
actionlint .github/workflows/ci.yml
actionlint .github/workflows/deploy.yml
# Expect: no errors

# Verify lint scripts exist
cd web && pnpm lint --dry-run 2>&1 | head -5
cd api && ./mvnw checkstyle:check -q
# Expect: no errors (or only whitespace warnings suppressible by checkstyle config)
```
