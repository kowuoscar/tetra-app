package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.model.Request;
import com.tetramobile.tetra.request.model.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RequestRepository extends JpaRepository<Request, UUID> {

    long countByStatusNot(RequestStatus status);

    long countByStatus(RequestStatus status);

    long countByCustomerIdAndStatusNot(UUID customerId, RequestStatus status);

    @Query("SELECT r FROM Request r WHERE r.customerId = :cid AND r.status = 'done'" +
        " AND FUNCTION('MONTH', r.doneAt) = :month AND FUNCTION('YEAR', r.doneAt) = :year")
    List<Request> findDoneByCustomerAndPeriod(@Param("cid") UUID customerId,
        @Param("month") int month, @Param("year") int year);

    @Query("SELECT r FROM Request r WHERE r.status = 'done'" +
        " AND FUNCTION('MONTH', r.doneAt) = :month AND FUNCTION('YEAR', r.doneAt) = :year")
    List<Request> findDoneByPeriod(@Param("month") int month, @Param("year") int year);
}
