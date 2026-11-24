package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.TicketPartUsage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketPartUsageRepository extends JpaRepository<TicketPartUsage, Long> {

    List<TicketPartUsage> findByTicketIdOrderByLoggedAtAsc(Long ticketId);

    long countByTicketId(Long ticketId);

    long countByTicketPartId(Long partId);
}
