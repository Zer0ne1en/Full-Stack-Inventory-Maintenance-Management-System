package com.mainspring.cmms.spec;

import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.TicketPriority;
import com.mainspring.cmms.domain.TicketStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Composable JPA predicates for ticket search, filtering and server-side pagination. */
public final class TicketSpecifications {

    private TicketSpecifications() {
    }

    public static Specification<MaintenanceTicket> withFilters(String query,
                                                               TicketStatus status,
                                                               TicketPriority priority,
                                                               Long machineId,
                                                               Long technicianId) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (query != null && !query.isBlank()) {
                String like = "%" + query.trim().toLowerCase() + "%";
                Join<Object, Object> machine = root.join("machine", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("ticketCode")), like),
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(machine.get("name")), like)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (priority != null) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }
            if (machineId != null) {
                predicates.add(cb.equal(root.get("machine").get("id"), machineId));
            }
            if (technicianId != null) {
                predicates.add(cb.equal(root.get("assignedTechnician").get("id"), technicianId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
