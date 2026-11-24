package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.exception.BadRequestException;
import com.mainspring.cmms.exception.ConflictException;
import com.mainspring.cmms.repository.UserRepository;
import com.mainspring.cmms.security.JwtService;
import com.mainspring.cmms.web.dto.AuthDtos;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Login, registration and password changes. */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        String email = normalize(request.email());
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("INVALID_CREDENTIALS", "Email or password is incorrect."));

        if (!user.isEnabled()) {
            throw new BadRequestException("ACCOUNT_DISABLED", "This account has been disabled.");
        }

        String token = jwtService.issueToken(user);
        return new AuthDtos.LoginResponse(token, "Bearer", jwtService.expirationMinutes() * 60,
                AuthDtos.UserSummary.from(user));
    }

    @Transactional
    public AuthDtos.UserSummary register(AuthDtos.RegisterRequest request) {
        String email = normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("EMAIL_IN_USE", "An account with this email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        // Self-service registration is deliberately the lowest-privilege role.
        user.setRole(com.mainspring.cmms.domain.Role.VIEWER);
        return AuthDtos.UserSummary.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserSummary currentUser(User user) {
        return AuthDtos.UserSummary.from(user);
    }

    @Transactional
    public void changePassword(Long userId, AuthDtos.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("NOT_FOUND", "Account not found."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("INVALID_CREDENTIALS", "Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("PASSWORD_REUSED",
                    "The new password must be different from the current one.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
