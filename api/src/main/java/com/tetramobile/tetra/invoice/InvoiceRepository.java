package com.tetramobile.tetra.invoice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByPeriodMonthAndPeriodYear(int month, int year);

    boolean existsByPeriodMonthAndPeriodYear(int month, int year);

    Optional<Invoice> findTopByOrderByPeriodYearDescPeriodMonthDesc();

    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    int nextInvoiceNumber();
}
