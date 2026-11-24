package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request/response payloads for user administration. */
public final class UserDtos {

    private UserDtos() {
    }

    public record CreateUserRequest(
            @NotBlank(message = "Name is required")
            @Size(min = 2, max = 100) String name,
            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid") String email,
            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters") String password,
            @NotNull(message = "Role is required") Role role) {
    }

    public record UpdateUserRequest(
            @Size(min = 2, max = 100) String name,
            Role role,
            Boolean enabled,
            @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters") String password) {
    }

    public record UserResponse(
            Long id,
            String name,
            String email,
            Role role,
            boolean enabled,
            java.time.Instant createdAt,
            long openTickets) {

        public static UserResponse from(com.mainspring.cmms.domain.User user, long openTickets) {
            return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                    user.isEnabled(), user.getCreatedAt(), openTickets);
        }
    }
}
