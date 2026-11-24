package com.mainspring.cmms.web;

import com.mainspring.cmms.repository.AuditLogRepository;
import com.mainspring.cmms.web.dto.AuditDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only audit trail — visible to admins and auditors. */
@RestController
@RequestMapping("/api/v1/audit")
@Tag(name = "Audit", description = "Who did what, when")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','VIEWER')")
    @Operation(summary = "Audit trail", description = "Newest first. Auditors can read, never write.")
    public PageResponse<AuditDtos.AuditLogResponse> list(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(auditLogRepository.findAll(pageable), AuditDtos.AuditLogResponse::from);
    }
}
