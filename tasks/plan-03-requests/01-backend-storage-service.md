# Backend — MinIO StorageService

## Domain

backend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-00-bootstrap/00-backend-scaffold.md` — AWS SDK v2 (`software.amazon.awssdk:s3`) already in pom.xml; `docker-compose.yml` has MinIO service

## References

- `specs/backend.md#storage` — StorageService contract, MinIO endpoint, bucket strategy
- `docs/architecture.md` — external dependencies section (MinIO)

## Context

Implement a self-contained `StorageService` backed by MinIO (S3-compatible). Used by plan-03 task 03 for attachment upload/download. The service must handle missing configuration gracefully (log WARN and throw) so the app starts even if MinIO is not configured in local dev.

---

### Inlined spec excerpts

**Config properties:**
```
minio.endpoint=http://localhost:9000
minio.access-key=minioadmin
minio.secret-key=minioadmin
minio.bucket=tetra-attachments
```

**StorageService operations:**
- `upload(String key, InputStream data, long contentLength, String contentType)` — PutObject
- `getPresignedDownloadUrl(String key, Duration expiry)` — returns URL string valid for `expiry`
- `delete(String key)` — DeleteObject
- Key format: `attachments/{requestId}/{UUID}-{filename}`

---

## Implementation

### 1. MinioProperties

`com.tetramobile.tetra.storage.MinioProperties`:
```java
@ConfigurationProperties(prefix = "minio")
public record MinioProperties(
    String endpoint,
    String accessKey,
    String secretKey,
    String bucket
) {}
```

Enable in main application class: `@EnableConfigurationProperties(MinioProperties.class)`.

### 2. S3Client bean

`com.tetramobile.tetra.storage.StorageConfig`:
```java
@Configuration
@RequiredArgsConstructor
public class StorageConfig {

    private final MinioProperties props;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .endpointOverride(URI.create(props.endpoint()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.accessKey(), props.secretKey())
            ))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .region(Region.US_EAST_1) // MinIO ignores region; value required by SDK
            .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
            .endpointOverride(URI.create(props.endpoint()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.accessKey(), props.secretKey())
            ))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .region(Region.US_EAST_1)
            .build();
    }
}
```

### 3. StorageService interface

`com.tetramobile.tetra.storage.StorageService`:
```java
public interface StorageService {
    void upload(String key, InputStream data, long contentLength, String contentType);
    String getPresignedDownloadUrl(String key, Duration expiry);
    void delete(String key);
}
```

### 4. MinioStorageServiceImpl

`com.tetramobile.tetra.storage.MinioStorageServiceImpl`:
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class MinioStorageServiceImpl implements StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final MinioProperties props;

    @Override
    public void upload(String key, InputStream data, long contentLength, String contentType) {
        try {
            s3Client.putObject(
                PutObjectRequest.builder()
                    .bucket(props.bucket())
                    .key(key)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build(),
                RequestBody.fromInputStream(data, contentLength)
            );
        } catch (S3Exception e) {
            log.error("MinIO upload failed: key={} bucket={}", key, props.bucket(), e);
            throw new StorageException("Upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getPresignedDownloadUrl(String key, Duration expiry) {
        try {
            var req = GetObjectPresignRequest.builder()
                .signatureDuration(expiry)
                .getObjectRequest(r -> r.bucket(props.bucket()).key(key).build())
                .build();
            return s3Presigner.presignGetObject(req).url().toString();
        } catch (S3Exception e) {
            log.error("MinIO presign failed: key={}", key, e);
            throw new StorageException("Presign failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .build());
        } catch (S3Exception e) {
            log.warn("MinIO delete failed: key={}", key, e);
        }
    }
}
```

### 5. StorageException

`com.tetramobile.tetra.storage.StorageException`:
```java
public class StorageException extends RuntimeException {
    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

Handle in `GlobalExceptionHandler`:
```java
@ExceptionHandler(StorageException.class)
public ResponseEntity<ErrorResponse> handleStorage(StorageException ex) {
    log.error("Storage error", ex);
    return ResponseEntity.status(502)
        .body(new ErrorResponse("storage_error", "File storage unavailable"));
}
```

### 6. application.yml additions

```yaml
minio:
  endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY:minioadmin}
  secret-key: ${MINIO_SECRET_KEY:minioadmin}
  bucket: ${MINIO_BUCKET:tetra-attachments}
```

### 7. Bucket creation on startup

`StorageConfig` — add `@EventListener(ApplicationReadyEvent.class)`:
```java
@EventListener(ApplicationReadyEvent.class)
public void ensureBucketExists() {
    try {
        s3Client.createBucket(CreateBucketRequest.builder()
            .bucket(props.bucket())
            .build());
        log.info("MinIO bucket created: {}", props.bucket());
    } catch (BucketAlreadyOwnedByYouException | BucketAlreadyExistsException ignored) {
        // bucket exists — fine
    } catch (Exception e) {
        log.warn("MinIO bucket check failed (storage may be unavailable): {}", e.getMessage());
    }
}
```

---

## Integration test

`MinioStorageIT` (`@SpringBootTest` + Testcontainers MinIO):

```java
@Testcontainers
@SpringBootTest
class MinioStorageIT {

    @Container
    static GenericContainer<?> minio = new GenericContainer<>("minio/minio:latest")
        .withEnv("MINIO_ROOT_USER", "minioadmin")
        .withEnv("MINIO_ROOT_PASSWORD", "minioadmin")
        .withCommand("server /data")
        .withExposedPorts(9000);

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("minio.endpoint", () -> "http://localhost:" + minio.getMappedPort(9000));
    }

    @Autowired StorageService storageService;

    @Test
    void uploadAndPresign() {
        byte[] bytes = "hello".getBytes();
        storageService.upload("test/file.txt",
            new ByteArrayInputStream(bytes), bytes.length, "text/plain");

        String url = storageService.getPresignedDownloadUrl("test/file.txt", Duration.ofMinutes(5));
        assertThat(url).contains("test/file.txt");
    }
}
```

---

## Acceptance criteria

- [ ] `StorageService.upload` puts object into MinIO bucket
- [ ] `getPresignedDownloadUrl` returns valid presigned URL
- [ ] App starts cleanly when MinIO is reachable (bucket auto-created)
- [ ] `StorageException` → HTTP 502 via `GlobalExceptionHandler`
- [ ] `./mvnw test -Dtest=MinioStorageIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=MinioStorageIT
./mvnw compile
```
