package com.mainspring.cmms.web;

import com.mainspring.cmms.security.SecurityUser;
import com.mainspring.cmms.service.AuthService;
import com.mainspring.cmms.service.AuditService;
import com.mainspring.cmms.web.dto.AuthDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authentication endpoints. */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login, registration and the current account")
public class AuthController {

    private final AuthService authService;
    private final AuditService auditService;

    public AuthController(AuthService authService, AuditService auditService) {
        this.authService = authService;
        this.auditService = auditService;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Sign in", description = "Exchanges credentials for a JWT bearer token.")
    public ResponseEntity<AuthDtos.LoginResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        AuthDtos.LoginResponse response = authService.login(request);
        auditService.log("LOGIN", "User", response.user().id(), "Signed in");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    @SecurityRequirements
    @Operation(summary = "Self-register", description = "Creates a read-only VIEWER account.")
    public ResponseEntity<AuthDtos.UserSummary> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Current user", description = "Resolves the caller from the bearer token.")
    public AuthDtos.UserSummary me(@AuthenticationPrincipal SecurityUser principal) {
        return authService.currentUser(principal.getUser());
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password", description = "Requires the current password.")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal SecurityUser principal,
                                               @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(principal.getId(), request);
        auditService.log("CHANGE_PASSWORD", "User", principal.getId(), "Password changed");
        return ResponseEntity.noContent().build();
    }
}
