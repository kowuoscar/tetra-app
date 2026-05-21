package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.AttachmentSummaryResponse;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface AttachmentService {
    AttachmentSummaryResponse upload(UUID requestId, MultipartFile file, AuthenticatedUser caller);
    void download(UUID requestId, UUID attachmentId, AuthenticatedUser caller,
                  HttpServletResponse response);
}
