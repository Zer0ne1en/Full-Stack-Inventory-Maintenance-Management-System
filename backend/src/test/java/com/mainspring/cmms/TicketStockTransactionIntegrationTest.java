package com.mainspring.cmms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.domain.TicketPartUsage;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.exception.InsufficientStockException;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.repository.TicketPartUsageRepository;
import com.mainspring.cmms.repository.UserRepository;
import com.mainspring.cmms.service.TicketService;
import com.mainspring.cmms.web.dto.TicketDtos;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

/**
 * Exercises the transactional stock deduction against a real (in-memory) database.
 *
 * <p>This is the test that backs the headline claim: closing a ticket deducts
 * exactly the requested quantity, and a short part aborts the entire transaction
 * — the ticket stays open and the inventory is untouched.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class TicketStockTransactionIntegrationTest {

    @Autowired
    private TicketService ticketService;
    @Autowired
    private SparePartRepository partRepository;
    @Autowired
    private MachineRepository machineRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private MaintenanceTicketRepository ticketRepository;
    @Autowired
    private TicketPartUsageRepository usageRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private User technician;
    private Machine machine;

    @BeforeEach
    void setUp() {
        technician = new User();
        technician.setName("Test Tech");
        technician.setEmail("tech-" + System.nanoTime() + "@mainspring.test");
        technician.setPasswordHash(passwordEncoder.encode("Secret123"));
        technician.setRole(Role.TECHNICIAN);
        technician = userRepository.save(technician);

        machine = new Machine();
        machine.setName("Test Press");
        machine.setCode("TST-" + System.nanoTime());
        machine.setServiceIntervalDays(90);
        machine = machineRepository.save(machine);
    }

    @Test
    void closingATicketDeductsExactlyTheLoggedQuantityAndWritesALedgerRow() {
        SparePart part = part("BEARING-" + System.nanoTime(), 5);
        MaintenanceTicket ticket = openTicket("Replace bearings", TicketStatus.IN_PROGRESS);

        TicketDtos.CloseTicketRequest request = new TicketDtos.CloseTicketRequest(
                "Replaced both spindle bearings.",
                List.of(new TicketDtos.UsageItem(part.getId(), 2)));

        TicketDtos.TicketResponse response = ticketService.closeTicket(ticket.getId(), request, technician);

        assertThat(response.status()).isEqualTo(TicketStatus.CLOSED);
        assertThat(response.closedAt()).isNotNull();
        assertThat(response.parts()).hasSize(1);
        assertThat(response.parts().get(0).quantityUsed()).isEqualTo(2);

        SparePart after = partRepository.findById(part.getId()).orElseThrow();
        assertThat(after.getQuantityOnHand()).isEqualTo(3);

        List<TicketPartUsage> ledger = usageRepository.findByTicketIdOrderByLoggedAtAsc(ticket.getId());
        assertThat(ledger).hasSize(1);
        assertThat(ledger.get(0).getQuantityUsed()).isEqualTo(2);
        assertThat(ledger.get(0).getUnitCost()).isEqualByComparingTo(new BigDecimal("320.00"));
    }

    @Test
    void duplicatePartLinesAreMergedIntoOneDeduction() {
        SparePart part = part("SEAL-" + System.nanoTime(), 10);
        MaintenanceTicket ticket = openTicket("Seal replacement", TicketStatus.IN_PROGRESS);

        TicketDtos.CloseTicketRequest request = new TicketDtos.CloseTicketRequest(null,
                List.of(new TicketDtos.UsageItem(part.getId(), 2),
                        new TicketDtos.UsageItem(part.getId(), 3)));

        ticketService.closeTicket(ticket.getId(), request, technician);

        assertThat(partRepository.findById(part.getId()).orElseThrow().getQuantityOnHand()).isEqualTo(5);
        assertThat(usageRepository.findByTicketIdOrderByLoggedAtAsc(ticket.getId())).hasSize(1);
    }

    @Test
    void insufficientStockAbortsTheWholeTransaction() {
        SparePart part = part("FILTER-" + System.nanoTime(), 3);
        MaintenanceTicket ticket = openTicket("Filter change", TicketStatus.IN_PROGRESS);

        TicketDtos.CloseTicketRequest request = new TicketDtos.CloseTicketRequest("Should not persist",
                List.of(new TicketDtos.UsageItem(part.getId(), 10)));

        assertThatThrownBy(() -> ticketService.closeTicket(ticket.getId(), request, technician))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("requested 10, only 3 available");

        // Nothing was written: stock, ticket status and ledger are all unchanged.
        assertThat(partRepository.findById(part.getId()).orElseThrow().getQuantityOnHand()).isEqualTo(3);
        MaintenanceTicket reloaded = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(reloaded.getClosedAt()).isNull();
        assertThat(usageRepository.findByTicketIdOrderByLoggedAtAsc(ticket.getId())).isEmpty();
    }

    @Test
    void aTechnicianCannotCloseAnotherTechniciansTicket() {
        SparePart part = part("SOLENOID-" + System.nanoTime(), 5);
        MaintenanceTicket ticket = openTicket("Not mine", TicketStatus.IN_PROGRESS);

        User other = new User();
        other.setName("Other Tech");
        other.setEmail("other-" + System.nanoTime() + "@mainspring.test");
        other.setPasswordHash(passwordEncoder.encode("Secret123"));
        other.setRole(Role.TECHNICIAN);
        other = userRepository.save(other);

        TicketDtos.CloseTicketRequest request = new TicketDtos.CloseTicketRequest(null,
                List.of(new TicketDtos.UsageItem(part.getId(), 1)));

        assertThatThrownBy(() -> ticketService.closeTicket(ticket.getId(), request, other))
                .hasMessageContaining("assigned to another technician");
        assertThat(partRepository.findById(part.getId()).orElseThrow().getQuantityOnHand()).isEqualTo(5);
    }

    @Test
    void closingTheLastOpenTicketReturnsTheMachineToOperational() {
        MaintenanceTicket ticket = openTicket("Single job", TicketStatus.IN_PROGRESS);
        ticketService.closeTicket(ticket.getId(), new TicketDtos.CloseTicketRequest("Done", null), technician);

        Machine reloaded = machineRepository.findById(machine.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(com.mainspring.cmms.domain.MachineStatus.OPERATIONAL);
        assertThat(reloaded.getLastServiceAt()).isNotNull();
        assertThat(reloaded.getNextServiceAt()).isAfter(reloaded.getLastServiceAt());
    }

    private SparePart part(String sku, int quantity) {
        SparePart part = new SparePart();
        part.setSku(sku);
        part.setName("Part " + sku);
        part.setCategory("Test");
        part.setQuantityOnHand(quantity);
        part.setReorderThreshold(0);
        part.setUnitPrice(new BigDecimal("320.00"));
        return partRepository.save(part);
    }

    private MaintenanceTicket openTicket(String title, TicketStatus status) {
        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setTicketCode("TKT-TEST-" + System.nanoTime());
        ticket.setTitle(title);
        ticket.setMachine(machine);
        ticket.setAssignedTechnician(technician);
        ticket.setCreatedBy(technician);
        ticket.setStatus(status);
        return ticketRepository.save(ticket);
    }
}
