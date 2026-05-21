package com.tetramobile.tetra.shared.dto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public record PagedResponse<T>(List<T> content, long totalElements, int totalPages, int page, int size) {

    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(page.getContent(), page.getTotalElements(),
                page.getTotalPages(), page.getNumber(), page.getSize());
    }

    public static <T> PagedResponse<T> of(List<T> content, int total, Pageable pageable) {
        int size = pageable.getPageSize();
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PagedResponse<>(content, total, totalPages, pageable.getPageNumber(), size);
    }
}
