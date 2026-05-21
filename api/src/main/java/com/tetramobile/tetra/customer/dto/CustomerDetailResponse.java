package com.tetramobile.tetra.customer.dto;

import com.tetramobile.tetra.customer.model.Customer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CustomerDetailResponse(
        UUID id,
        String name,
        String contactInfo,
        String whatsappGroupId,
        int phoneCount,
        int simCardCount,
        int openRequestCount,
        BigDecimal currentMonthCost,
        Instant createdAt
) {

    public static CustomerDetailResponse from(Customer c) {
        return new CustomerDetailResponse(
                c.getId(),
                c.getName(),
                c.getContactInfo(),
                c.getWhatsappGroupId(),
                0,
                0,
                0,
                BigDecimal.ZERO,
                c.getCreatedAt()
        );
    }

    public static CustomerDetailResponse from(
            Customer c,
            int phoneCount,
            int simCardCount,
            int openRequestCount,
            BigDecimal currentMonthCost) {
        return new CustomerDetailResponse(
                c.getId(),
                c.getName(),
                c.getContactInfo(),
                c.getWhatsappGroupId(),
                phoneCount,
                simCardCount,
                openRequestCount,
                currentMonthCost,
                c.getCreatedAt()
        );
    }
}
