package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.MaintenanceTicket;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface MaintenanceTicketRepository
        extends JpaRepository<MaintenanceTicket, Long>, JpaSpecificationExecutor<MaintenanceTicket> {

    Page<MaintenanceTicket> findByMachineId(Long machineId, Pageable pageable);

    Page<MaintenanceTicket> findByAssignedTechnicianId(Long technicianId, Pageable pageable);

    long countByStatus(com.mainspring.cmms.domain.TicketStatus status);

    long countByStatusNot(com.mainspring.cmms.domain.TicketStatus status);

    long countByMachineId(Long machineId);

    long countByAssignedTechnicianIdAndStatusNot(Long technicianId,
                                                  com.mainspring.cmms.domain.TicketStatus status);

    long countByMachineIdAndStatusNot(Long machineId, com.mainspring.cmms.domain.TicketStatus status);

    long countByOpenedAtBeforeAndStatusNot(Instant openedAt, com.mainspring.cmms.domain.TicketStatus status);

    List<MaintenanceTicket> findByOpenedAtGreaterThanEqual(Instant since);

    /**
     * Open (non-closed) ticket counts per machine, fetched in one query so the
     * machine list screen does not degrade into N+1 count queries.
     */
    @Query("select t.machine.id, count(t) from MaintenanceTicket t "
            + "where t.status <> com.mainspring.cmms.domain.TicketStatus.CLOSED group by t.machine.id")
    List<Object[]> countOpenTicketsByMachine();

    List<MaintenanceTicket> findByStatusNotAndOpenedAtBefore(
            com.mainspring.cmms.domain.TicketStatus status, Instant openedAt);

    List<MaintenanceTicket> findTop5ByStatusNotOrderByOpenedAtAsc(
            com.mainspring.cmms.domain.TicketStatus status);
}
