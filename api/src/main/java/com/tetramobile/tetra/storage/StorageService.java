package com.tetramobile.tetra.storage;

import java.io.InputStream;
import java.time.Duration;

public interface StorageService {
    void upload(String key, InputStream data, long contentLength, String contentType);
    String getPresignedDownloadUrl(String key, Duration expiry);
    InputStream download(String key);
    void delete(String key);
}
