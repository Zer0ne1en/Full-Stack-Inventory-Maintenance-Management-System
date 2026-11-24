package com.mainspring.cmms.bootstrap;

import com.mainspring.cmms.config.AppProperties;
import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MachineStatus;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.domain.TicketPartUsage;
import com.mainspring.cmms.domain.TicketPriority;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.repository.TicketPartUsageRepository;
import com.mainspring.cmms.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds a realistic demo plant the first time the application starts against an
 * empty database. Disabled with {@code app.seed-demo-data=false}.
 *
 * <p>Demo credentials (documented in the README):
 * admin@mainspring.dev / Admin@123 — admin@mainspring.dev
 * tech@mainspring.dev / Tech@123 — technician
 * viewer@mainspring.dev / Viewer@123 — read-only auditor</p>
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepository;
    private final MachineRepository machineRepository;
    private final SparePartRepository partRepository;
    private final MaintenanceTicketRepository ticketRepository;
    private final TicketPartUsageRepository usageRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DemoDataSeeder(UserRepository userRepository,
                          MachineRepository machineRepository,
                          SparePartRepository partRepository,
                          MaintenanceTicketRepository ticketRepository,
                          TicketPartUsageRepository usageRepository,
                          PasswordEncoder passwordEncoder,
                          AppProperties appProperties) {
        this.userRepository = userRepository;
        this.machineRepository = machineRepository;
        this.partRepository = partRepository;
        this.ticketRepository = ticketRepository;
        this.usageRepository = usageRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!appProperties.seedDemoData()) {
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Demo data skipped: database already contains {} user(s).", userRepository.count());
            return;
        }
        log.info("Seeding demo data ...");
        seed();
        log.info("Demo data ready. Sign in with admin@mainspring.dev / Admin@123");
    }

    private void seed() {
        User admin = user("Aarav Mehta", "admin@mainspring.dev", "Admin@123", Role.ADMIN);
        User technician = user("Priya Rout", "tech@mainspring.dev", "Tech@123", Role.TECHNICIAN);
        user("Devanshi Rao", "viewer@mainspring.dev", "Viewer@123", Role.VIEWER);

        LocalDate today = LocalDate.now();

        Machine cnc = machine("CNC Milling Center VX-900", "CNC-0042", "Haas", "VF-2SS",
                "Bay A · Cell 1", MachineStatus.OPERATIONAL, today.minusDays(75), today.plusDays(15));
        Machine press = machine("Hydraulic Press HP-220", "HYD-0107", "Schuler", "MSD-220",
                "Bay B · Forming", MachineStatus.UNDER_MAINTENANCE, today.minusDays(120), today.minusDays(30));
        Machine conveyor = machine("Conveyor Line 3", "CNV-0003", "Interroll", "RCP-400",
                "Bay A · Logistics", MachineStatus.OPERATIONAL, today.minusDays(45), today.plusDays(45));
        Machine robot = machine("Industrial Robot Arm IR-8", "ROB-0021", "Fanuc", "R-2000iC",
                "Bay C · Welding", MachineStatus.OPERATIONAL, today.minusDays(95), today.minusDays(5));
        Machine compressor = machine("Air Compressor AC-2", "ACP-0002", "Atlas Copco", "GA-75",
                "Utility Room", MachineStatus.OPERATIONAL, today.minusDays(30), today.plusDays(60));
        Machine packager = machine("Packaging Unit PU-4", "PKG-0004", "Bosch", "Sigpack HSM",
                "Bay D · Packing", MachineStatus.OUT_OF_SERVICE, today.minusDays(20), today.plusDays(70));

        SparePart bearing6205 = part("BRG-6205", "Deep Groove Ball Bearing 6205-2RS", "Bearings", 14, 20, "320.00");
        part("BRG-6308", "Ball Bearing 6308-C3", "Bearings", 4, 10, "585.00");
        part("SEL-40x60", "Oil Seal 40x60x8 NBR", "Seals", 46, 25, "145.50");
        part("FLT-MIC-01", "Hydraulic Filter Element 10\u00b5m", "Filtration", 9, 12, "1240.00");
        SparePart vBelt = part("BLT-VBELT-B52", "V-Belt B-52", "Belts & Pulleys", 12, 8, "890.00");
        part("CNV-BELT-800", "Conveyor Belt 800 mm \u00d7 12 m", "Belts & Pulleys", 1, 2, "42500.00");
        part("SOL-24V-25A", "Solenoid Valve 24V DC", "Valves", 7, 6, "2100.00");
        part("PMP-GEAR-05", "Gear Pump 0.5 cc/rev", "Hydraulics", 3, 4, "12800.00");
        part("REL-220V-C1", "Thermal Overload Relay 9-14 A", "Electrical", 22, 10, "760.00");
        part("SW-LIMIT-L1", "Limit Switch IP67", "Electrical", 31, 15, "480.00");
        SparePart grease = part("LUB-GRS-400", "Lithium Grease Cartridge 400 g", "Lubricants", 5, 8, "320.00");
        SparePart airFilter = part("FLT-AIR-P5", "Air Filter Element P5", "Filtration", 18, 10, "640.00");

        MaintenanceTicket t1 = ticket("TKT-2026-0001", "Replace spindle bearing on CNC-0042",
                "Audible growl from the spindle at 8,000 rpm. Vibration reading 4.2 mm/s, "
                        + "up from the 1.8 mm/s baseline. Suspect front bearing.",
                cnc, technician, admin, TicketStatus.OPEN, TicketPriority.HIGH, 2, null);
        ticket("TKT-2026-0002", "Hydraulic pressure drop on press",
                "System pressure falls from 210 to 160 bar under load. Suspect worn gear pump or "
                        + "blocked return filter. Production stopped on the forming line.",
                press, technician, admin, TicketStatus.IN_PROGRESS, TicketPriority.CRITICAL, 6, null);
        ticket("TKT-2026-0003", "Conveyor belt tracking off-centre",
                "Belt drifts 15 mm towards the drive side and frays the edge. Tension on the "
                        + "tail pulley is uneven after last week's splice.",
                conveyor, technician, admin, TicketStatus.IN_PROGRESS, TicketPriority.HIGH, 4, null);
        ticket("TKT-2026-0004", "Teach pendant cable frayed",
                "Insulation worn through at the strain relief. Robot still operational but the "
                        + "cable fails a pull test. Schedule during the next changeover.",
                robot, technician, admin, TicketStatus.OPEN, TicketPriority.MEDIUM, 1, null);
        MaintenanceTicket t5 = ticket("TKT-2026-0005", "Compressor tripping on high temperature",
                "Unit tripped three times on the thermal cut-out. Ambient 41 \u00b0C, discharge 118 \u00b0C.",
                compressor, technician, admin, TicketStatus.CLOSED, TicketPriority.HIGH, 9,
                "Replaced the clogged air filter element and cleaned the aftercooler fins. "
                        + "Discharge temperature back to 92 \u00b0C after a 30-minute soak test.");
        MaintenanceTicket t6 = ticket("TKT-2026-0006", "Quarterly lubrication — CNC spindle",
                "Scheduled 90-day lubrication of the spindle and linear guides.",
                cnc, technician, admin, TicketStatus.CLOSED, TicketPriority.LOW, 12,
                "Completed the full lubrication route. No unusual noise or heat.");
        ticket("TKT-2026-0007", "Safety interlock intermittent on packaging unit",
                "Guard door interlock drops out mid-cycle without the door being opened. Unit "
                        + "locked out pending inspection.",
                packager, null, admin, TicketStatus.OPEN, TicketPriority.CRITICAL, 3, null);
        MaintenanceTicket t8 = ticket("TKT-2026-0008", "Replace worn V-belt on conveyor drive",
                "Belt glazing and cracking visible on the outer face. Squeal on cold start.",
                conveyor, technician, admin, TicketStatus.CLOSED, TicketPriority.MEDIUM, 16,
                "Fitted a new B-52 belt and re-tensioned to 1.6% elongation.");

        usage(t5, airFilter, 2, technician, 9);
        usage(t6, grease, 1, technician, 12);
        usage(t8, vBelt, 2, technician, 16);
        usage(t1, bearing6205, 0, technician, 2);
    }

    private User user(String name, String email, String rawPassword, Role role) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        return userRepository.save(user);
    }

    private Machine machine(String name, String code, String manufacturer, String model, String location,
                            MachineStatus status, LocalDate lastService, LocalDate nextService) {
        Machine machine = new Machine();
        machine.setName(name);
        machine.setCode(code);
        machine.setManufacturer(manufacturer);
        machine.setModel(model);
        machine.setLocation(location);
        machine.setStatus(status);
        machine.setInstalledOn(lastService.minusYears(3));
        machine.setLastServiceAt(lastService);
        machine.setNextServiceAt(nextService);
        machine.setServiceIntervalDays(90);
        return machineRepository.save(machine);
    }

    private SparePart part(String sku, String name, String category, int quantity, int threshold, String price) {
        SparePart part = new SparePart();
        part.setSku(sku);
        part.setName(name);
        part.setDescription(name + " — stocked item for planned and corrective maintenance.");
        part.setCategory(category);
        part.setUnitOfMeasure("pcs");
        part.setQuantityOnHand(quantity);
        part.setReorderThreshold(threshold);
        part.setUnitPrice(new BigDecimal(price));
        return partRepository.save(part);
    }

    private MaintenanceTicket ticket(String code, String title, String description, Machine machine,
                                     User technician, User creator, TicketStatus status,
                                     TicketPriority priority, int daysAgo, String resolution) {
        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setTicketCode(code);
        ticket.setTitle(title);
        ticket.setDescription(description);
        ticket.setMachine(machine);
        ticket.setAssignedTechnician(technician);
        ticket.setCreatedBy(creator);
        ticket.setStatus(status);
        ticket.setPriority(priority);
        ticket.setOpenedAt(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
        ticket.setResolution(resolution);
        if (status == TicketStatus.CLOSED) {
            ticket.setClosedAt(Instant.now().minus(Math.max(0, daysAgo - 1), ChronoUnit.DAYS));
        }
        return ticketRepository.save(ticket);
    }

    private void usage(MaintenanceTicket ticket, SparePart part, int quantity, User logger, int daysAgo) {
        if (quantity <= 0) {
            return;
        }
        TicketPartUsage usage = new TicketPartUsage();
        usage.setTicket(ticket);
        usage.setPart(part);
        usage.setQuantityUsed(quantity);
        usage.setUnitCost(part.getUnitPrice());
        usage.setLoggedBy(logger);
        usage.setLoggedAt(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
        usageRepository.save(usage);
    }
}
