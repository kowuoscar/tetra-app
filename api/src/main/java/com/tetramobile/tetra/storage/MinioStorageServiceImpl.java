package com.tetramobile.tetra.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.time.Duration;

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
    public InputStream download(String key) {
        try {
            return s3Client.getObject(GetObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .build());
        } catch (Exception e) {
            log.error("MinIO download failed for key={}", key, e);
            throw new StorageException("Cannot download file from storage", e);
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
