package com.mainspring.cmms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mainspring.cmms.config.JwtProperties;
import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.security.JwtService;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

/** Pure unit test — no Spring context required. */
class JwtServiceTest {

    private final JwtService jwtService =
            new JwtService(new JwtProperties("0123456789abcdef0123456789abcdef0123456789abcdef", 30, "test-issuer"));

    @Test
    void roundTripsTheSubjectAndRole() {
        User user = new User();
        user.setId(42L);
        user.setEmail("someone@mainspring.dev");
        user.setName("Someone");
        user.setRole(Role.ADMIN);

        String token = jwtService.issueToken(user);

        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtService.parse(token).get("role")).isEqualTo("ADMIN");
        assertThat(jwtService.parse(token).getIssuer()).isEqualTo("test-issuer");
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() {
        JwtService other = new JwtService(
                new JwtProperties("ffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 30, "test-issuer"));

        User user = new User();
        user.setId(1L);
        user.setRole(Role.VIEWER);
        String foreignToken = other.issueToken(user);

        assertThatThrownBy(() -> jwtService.extractUserId(foreignToken)).isInstanceOf(JwtException.class);
    }
}
