package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** Request/response payloads for authentication and account endpoints. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            String email,
            @NotBlank(message = "Password is required")
            String password) {
    }

    public record RegisterRequest(
            @NotBlank(message = "Name is required")
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,
            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            String email,
            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
            String password) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Current password is required")
            String currentPassword,
            @NotBlank(message = "New password is required")
            @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
            String newPassword) {
    }

    public record UserSummary(
            Long id,
            String name,
            String email,
            String role,
            boolean enabled,
            Instant createdAt) {

        public static UserSummary from(User user) {
            return new UserSummary(user.getId(), user.getName(), user.getEmail(),
                    user.getRole().name(), user.isEnabled(), user.getCreatedAt());
        }
    }

    public record LoginResponse(
            String token,
            String tokenType,
            long expiresIn,
            UserSummary user) {
    }
}
