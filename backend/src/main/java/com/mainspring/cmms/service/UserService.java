package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.exception.BadRequestException;
import com.mainspring.cmms.exception.ConflictException;
import com.mainspring.cmms.exception.NotFoundException;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.UserRepository;
import com.mainspring.cmms.spec.UserSpecifications;
import com.mainspring.cmms.web.dto.AuthDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.UserDtos;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** User administration: accounts, roles and the technician roster. */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final MaintenanceTicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository,
                       MaintenanceTicketRepository ticketRepository,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDtos.UserResponse> search(String query, com.mainspring.cmms.domain.Role role,
                                                      Pageable pageable) {
        Page<User> page = userRepository.findAll(
                UserSpecifications.withFilters(query, role), pageable);
        return PageResponse.from(page,
                user -> UserDtos.UserResponse.from(user, openTicketsFor(user.getId())));
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.UserSummary> technicians() {
        List<User> users = userRepository.findByRoleAndEnabledTrue(com.mainspring.cmms.domain.Role.TECHNICIAN);
        users.addAll(userRepository.findByRoleAndEnabledTrue(com.mainspring.cmms.domain.Role.ADMIN));
        return users.stream().map(AuthDtos.UserSummary::from).toList();
    }

    @Transactional(readOnly = true)
    public UserDtos.UserResponse get(Long id) {
        User user = find(id);
        return UserDtos.UserResponse.from(user, openTicketsFor(id));
    }

    @Transactional
    public UserDtos.UserResponse create(UserDtos.CreateUserRequest request, User actor) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("EMAIL_IN_USE", "An account with this email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        User saved = userRepository.save(user);

        auditService.log("CREATE", "User", saved.getId(),
                "Created " + saved.getRole().name().toLowerCase() + " account " + saved.getEmail());
        return UserDtos.UserResponse.from(saved, 0);
    }

    @Transactional
    public UserDtos.UserResponse update(Long id, UserDtos.UpdateUserRequest request, User actor) {
        User user = find(id);
        StringBuilder changes = new StringBuilder();

        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
            changes.append("name; ");
        }
        if (request.role() != null && request.role() != user.getRole()) {
            if (user.getId().equals(actor.getId())) {
                throw new BadRequestException("CANNOT_CHANGE_OWN_ROLE",
                        "You cannot change the role of the account you are signed in with.");
            }
            user.setRole(request.role());
            changes.append("role=").append(request.role()).append("; ");
        }
        if (request.enabled() != null && request.enabled() != user.isEnabled()) {
            if (user.getId().equals(actor.getId()) && !request.enabled()) {
                throw new BadRequestException("CANNOT_DISABLE_SELF", "You cannot disable your own account.");
            }
            user.setEnabled(request.enabled());
            changes.append("enabled=").append(request.enabled()).append("; ");
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            changes.append("password reset; ");
        }

        auditService.log("UPDATE", "User", id, changes.toString());
        return UserDtos.UserResponse.from(user, openTicketsFor(id));
    }

    private long openTicketsFor(Long userId) {
        return ticketRepository.countByAssignedTechnicianIdAndStatusNot(userId,
                com.mainspring.cmms.domain.TicketStatus.CLOSED);
    }

    private User find(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User", id));
    }
}
