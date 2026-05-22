package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.AttachmentSummaryResponse;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

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
