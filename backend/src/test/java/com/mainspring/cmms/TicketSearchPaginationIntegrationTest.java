package com.mainspring.cmms;

import static org.assertj.core.api.Assertions.assertThat;

import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.TicketPriority;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.service.TicketService;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.TicketDtos;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

/** Verifies server-side pagination, status filtering and free-text search. */
@SpringBootTest
@ActiveProfiles("test")
class TicketSearchPaginationIntegrationTest {

    @Autowired
    private TicketService ticketService;
    @Autowired
    private MaintenanceTicketRepository ticketRepository;
    @Autowired
    private MachineRepository machineRepository;

    private Machine machine;

    @BeforeEach
    void setUp() {
        machine = new Machine();
        machine.setName("Filter Machine " + System.nanoTime());
        machine.setCode("FLT-" + System.nanoTime());
        machine.setServiceIntervalDays(90);
        machine = machineRepository.save(machine);

        for (int i = 0; i < 7; i++) {
            MaintenanceTicket ticket = new MaintenanceTicket();
            ticket.setTicketCode("SRCH-" + System.nanoTime() + "-" + i);
            ticket.setTitle(i % 2 == 0 ? "Bearing noise on line " + i : "Hydraulic leak " + i);
            ticket.setDescription("Searchable description " + i);
            ticket.setMachine(machine);
            ticket.setStatus(i < 3 ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS);
            ticket.setPriority(i == 0 ? TicketPriority.CRITICAL : TicketPriority.MEDIUM);
            ticket.setOpenedAt(Instant.now().minusSeconds(i * 3600L));
            ticketRepository.save(ticket);
        }
    }

    @Test
    void paginatesAndReportsTotals() {
        PageResponse<TicketDtos.TicketResponse> page =
                ticketService.search(null, null, null, machine.getId(), null,
                        PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "openedAt")));

        assertThat(page.size()).isEqualTo(2);
        assertThat(page.content()).hasSize(2);
        assertThat(page.totalElements()).isEqualTo(7);
        assertThat(page.totalPages()).isEqualTo(4);
        assertThat(page.last()).isFalse();

        PageResponse<TicketDtos.TicketResponse> last =
                ticketService.search(null, null, null, machine.getId(), null,
                        PageRequest.of(3, 2, Sort.by(Sort.Direction.DESC, "openedAt")));

        assertThat(last.content()).hasSize(1);
        assertThat(last.last()).isTrue();
    }

    @Test
    void filtersByStatus() {
        PageResponse<TicketDtos.TicketResponse> open =
                ticketService.search(null, TicketStatus.OPEN, null, machine.getId(), null,
                        PageRequest.of(0, 50));

        assertThat(open.totalElements()).isEqualTo(3);
        assertThat(open.content()).allMatch(t -> t.status() == TicketStatus.OPEN);
    }

    @Test
    void filtersByPriority() {
        PageResponse<TicketDtos.TicketResponse> critical =
                ticketService.search(null, null, TicketPriority.CRITICAL, machine.getId(), null,
                        PageRequest.of(0, 50));

        assertThat(critical.totalElements()).isEqualTo(1);
        assertThat(critical.content().get(0).priority()).isEqualTo(TicketPriority.CRITICAL);
    }

    @Test
    void searchesAcrossTitleDescriptionAndMachineName() {
        PageResponse<TicketDtos.TicketResponse> byTitle =
                ticketService.search("bearing", null, null, machine.getId(), null, PageRequest.of(0, 50));
        assertThat(byTitle.totalElements()).isEqualTo(4);

        PageResponse<TicketDtos.TicketResponse> byDescription =
                ticketService.search("searchable description 3", null, null, machine.getId(), null,
                        PageRequest.of(0, 50));
        assertThat(byDescription.totalElements()).isEqualTo(1);

        PageResponse<TicketDtos.TicketResponse> byMachine =
                ticketService.search("filter machine", null, null, null, null, PageRequest.of(0, 50));
        assertThat(byMachine.totalElements()).isGreaterThanOrEqualTo(7);
    }
}
