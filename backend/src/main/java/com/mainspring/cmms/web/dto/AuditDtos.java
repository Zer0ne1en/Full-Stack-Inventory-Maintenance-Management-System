package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.AuditLog;
import java.time.Instant;

/** Read-only audit trail payload. */
public final class AuditDtos {

    private AuditDtos() {
    }

    public record AuditLogResponse(
            Long id,
            String actorName,
            String actorRole,
            String action,
            String entity,
            Long entityId,
            String details,
            String ip,
            Instant createdAt) {

        public static AuditLogResponse from(AuditLog log) {
            return new AuditLogResponse(log.getId(), log.getActorName(), log.getActorRole(),
                    log.getAction(), log.getEntity(), log.getEntityId(), log.getDetails(), log.getIp(),
                    log.getCreatedAt());
        }
    }
}
