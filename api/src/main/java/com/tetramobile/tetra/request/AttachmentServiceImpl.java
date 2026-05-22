package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.AttachmentSummaryResponse;
import com.tetramobile.tetra.request.model.Attachment;
import com.tetramobile.tetra.request.model.Request;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.storage.StorageException;
import com.tetramobile.tetra.storage.StorageService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttachmentServiceImpl implements AttachmentService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp"
    );
    private static final long MAX_BYTES = 10L * 1024 * 1024;

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
            .orElseThrow(() -> new NotFoundException("Attachment not found"));

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
            .orElseThrow(() -> new NotFoundException("Request not found"));
        if (caller.isCustomer() && !request.getCustomerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Access denied");
    }
}
