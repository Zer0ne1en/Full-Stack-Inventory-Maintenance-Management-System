package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.Alert;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    boolean existsByTypeAndReferenceIdAndReadAtIsNull(com.mainspring.cmms.domain.AlertType type, Long referenceId);

    long countByReadAtIsNull();

    Page<Alert> findByReadAtIsNull(Pageable pageable);

    Page<Alert> findByReadAtIsNullOrderByCreatedAtDesc(Pageable pageable);

    long countByCreatedAtAfter(Instant createdAfter);
}
