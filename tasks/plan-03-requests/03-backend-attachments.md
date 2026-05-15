# Backend — Attachment Upload and Download

## Domain

backend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/01-backend-storage-service.md` — StorageService + MinioStorageServiceImpl
- `tasks/plan-03-requests/02-backend-request-service.md` — AttachmentRepository, Request entity, access-check pattern

## References

- `specs/backend.md#attachment-rules` — max size, content type, key format
- `docs/contracts.md#post-requestsidattachments`

## Context

Two endpoints: multipart upload (POST) and binary stream download (GET per attachment). No list endpoint — attachment list is embedded in `RequestDetail` (AttachmentSummary array). Key format: `attachments/{requestId}/{UUID}`. StorageService needs a `download()` method added for streaming.

**Correct specs (verified against contracts.md):**
- Max size: **10 MB** (not 20)
- Allowed types: **image/jpeg, image/png, image/webp** (not PDF)
- `AttachmentSummary` shape: `{ id, uploaded_by_user_id, created_at }` — no filename, no download_url
- Download: `GET /requests/{id}/attachments/{attachmentId}` → binary stream (not presigned URL)
- POST response: AttachmentSummary only

---

### Inlined spec excerpts

**POST /requests/{id}/attachments:**
```
Auth: admin, company, customer (own request only)
Content-Type: multipart/form-data
Field: file (required)
Rules:
  - max size 10 MB
  - allowed content types: image/jpeg, image/png, image/webp
  - key = attachments/{requestId}/{randomUUID}
  - persist Attachment row after successful upload
Response 201: { id, uploaded_by_user_id, created_at }
Errors: 413 (file too large), 422 (unsupported content type), 404 (request not found)
```

**GET /requests/{id}/attachments/{attachmentId}:**
```
Auth: admin, company, customer (own request only)
Response 200: binary stream
  Content-Type: original content type (image/jpeg, image/png, image/webp)
  Content-Disposition: attachment
Errors: 404 (attachment not found or wrong request)
```

---

## Implementation

### 1. Add `download()` to StorageService

`com.tetramobile.tetra.storage.StorageService`:
```java
public interface StorageService {
    void upload(String key, InputStream data, long contentLength, String contentType);
    String getPresignedDownloadUrl(String key, Duration expiry);
    InputStream download(String key);  // ← add this
    void delete(String key);
}
```

`com.tetramobile.tetra.storage.MinioStorageServiceImpl`:
```java
@Override
public InputStream download(String key) {
    try {
        return s3Client.getObject(GetObjectRequest.builder()
            .bucket(minioProperties.getBucket())
            .key(key)
            .build());
    } catch (Exception e) {
        log.error("MinIO download failed for key={}", key, e);
        throw new StorageException("Cannot download file from storage", e);
    }
}
```

### 2. AttachmentSummaryResponse record

`com.tetramobile.tetra.request.dto.AttachmentSummaryResponse`:
```java
public record AttachmentSummaryResponse(
    UUID id,
    UUID uploadedByUserId,
    Instant createdAt
) {
    public static AttachmentSummaryResponse from(Attachment a) {
        return new AttachmentSummaryResponse(a.getId(), a.getUploadedBy(), a.getCreatedAt());
    }
}
```

(This record is also referenced in `02-backend-request-service.md` — ensure one definition in `dto` package.)

### 3. AttachmentService

`com.tetramobile.tetra.request.AttachmentService`:
```java
public interface AttachmentService {
    AttachmentSummaryResponse upload(UUID requestId, MultipartFile file, AuthenticatedUser caller);
    void download(UUID requestId, UUID attachmentId, AuthenticatedUser caller,
                  HttpServletResponse response);
}
```

`com.tetramobile.tetra.request.AttachmentServiceImpl`:
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AttachmentServiceImpl implements AttachmentService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp"
    );
    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB

    private final AttachmentRepository attachmentRepository;
    private final RequestRepository requestRepository;
    private final StorageService storageService;

    @Override
    @Transactional
    public AttachmentSummaryResponse upload(UUID requestId, MultipartFile file,
                                            AuthenticatedUser caller) {
        findAndCheckAccess(requestId, caller);

        String contentType = file.getContentType();
        if (!ALLOWED_TYPES.contains(contentType))
            throw new UnprocessableEntityException("unsupported_content_type",
                "Allowed types: image/jpeg, image/png, image/webp");

        if (file.getSize() > MAX_BYTES)
            throw new UnprocessableEntityException("file_too_large", "Max file size is 10 MB");

        String key = "attachments/" + requestId + "/" + UUID.randomUUID();

        try {
            storageService.upload(key, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new StorageException("Cannot read uploaded file", e);
        }

        Attachment attachment = new Attachment();
        attachment.setRequestId(requestId);
        attachment.setStorageKey(key);
        attachment.setOriginalFilename(file.getOriginalFilename());
        attachment.setContentType(contentType);
        attachment.setUploadedBy(caller.userId());
        attachmentRepository.save(attachment);

        return AttachmentSummaryResponse.from(attachment);
    }

    @Override
    @Transactional(readOnly = true)
    public void download(UUID requestId, UUID attachmentId, AuthenticatedUser caller,
                         HttpServletResponse response) {
        findAndCheckAccess(requestId, caller);

        Attachment attachment = attachmentRepository.findById(attachmentId)
            .filter(a -> a.getRequestId().equals(requestId))
            .orElseThrow(() -> new NotFoundException("attachment_not_found", "Attachment not found"));

        response.setContentType(attachment.getContentType() != null
            ? attachment.getContentType() : "application/octet-stream");
        response.setHeader("Content-Disposition", "attachment");

        try (InputStream stream = storageService.download(attachment.getStorageKey())) {
            stream.transferTo(response.getOutputStream());
        } catch (IOException e) {
            log.error("Attachment stream failed for id={}", attachmentId, e);
            throw new StorageException("Cannot stream attachment", e);
        }
    }

    private void findAndCheckAccess(UUID requestId, AuthenticatedUser caller) {
        Request request = requestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("request_not_found", "Request not found"));
        if (caller.isCustomer() && !request.getCustomerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Access denied");
    }
}
```

### 4. AttachmentController

`com.tetramobile.tetra.request.AttachmentController`:
```java
@RestController
@RequestMapping("/api/v1/requests/{id}/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentSummaryResponse> upload(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(201)
            .body(attachmentService.upload(id, file, SecurityUtils.currentUser()));
    }

    @GetMapping("/{attachmentId}")
    public void download(
            @PathVariable UUID id,
            @PathVariable UUID attachmentId,
            HttpServletResponse response) {
        attachmentService.download(id, attachmentId, SecurityUtils.currentUser(), response);
    }
}
```

### 5. Multipart config

`application.yml`:
```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 11MB
```

### 6. Handle MaxUploadSizeExceededException in GlobalExceptionHandler

```java
@ExceptionHandler(MaxUploadSizeExceededException.class)
public ResponseEntity<ErrorResponse> handleMaxUpload(MaxUploadSizeExceededException ex) {
    return ResponseEntity.status(413)
        .body(new ErrorResponse("file_too_large", "Max file size is 10 MB"));
}
```

---

## Integration test

`AttachmentIT` (`@SpringBootTest` + Testcontainers MinIO + PostgreSQL):
- Upload JPEG (< 10 MB) to `POST /requests/{id}/attachments` → 201, returns `{id, uploaded_by_user_id, created_at}`
- Upload WebP → 201
- Upload PDF (application/pdf) → 422 unsupported_content_type
- Upload file > 10 MB → 413
- `GET /requests/{id}/attachments/{attachmentId}` → 200 binary stream with correct Content-Type
- Customer accessing another customer's request → 403
- Wrong requestId in download path (attachment belongs to different request) → 404
- Attachment row persists in DB with correct storageKey

---

## Acceptance criteria

- [ ] `POST /requests/{id}/attachments` stores file in MinIO, persists Attachment row, returns AttachmentSummary
- [ ] Unsupported content type (PDF, text) → 422
- [ ] File > 10 MB → 413
- [ ] `GET /requests/{id}/attachments/{attachmentId}` streams binary with original content type
- [ ] Customer cannot access another customer's request attachments
- [ ] `StorageService.download()` method added and wired in `MinioStorageServiceImpl`
- [ ] `./mvnw test -Dtest=AttachmentIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=AttachmentIT
./mvnw verify
```
