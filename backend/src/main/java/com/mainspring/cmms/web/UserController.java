package com.mainspring.cmms.web;

import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.security.SecurityUser;
import com.mainspring.cmms.service.UserService;
import com.mainspring.cmms.web.dto.AuthDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.UserDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** User administration and the technician roster. */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Accounts, roles and the technician roster")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List users (admin only)")
    public PageResponse<UserDtos.UserResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            @PageableDefault(size = 10, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return userService.search(q, role, pageable);
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @Operation(summary = "Assignable technicians", description = "Used by the assignment dropdown.")
    public List<AuthDtos.UserSummary> technicians() {
        return userService.technicians();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "User detail (admin only)")
    public UserDtos.UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a user (admin only)")
    public ResponseEntity<UserDtos.UserResponse> create(
            @AuthenticationPrincipal SecurityUser principal,
            @Valid @RequestBody UserDtos.CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request, principal.getUser()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update role / status / password (admin only)")
    public UserDtos.UserResponse update(@PathVariable Long id,
                                        @Valid @RequestBody UserDtos.UpdateUserRequest request,
                                        @AuthenticationPrincipal SecurityUser principal) {
        return userService.update(id, request, principal.getUser());
    }
}
