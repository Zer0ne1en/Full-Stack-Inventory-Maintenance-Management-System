package com.mainspring.cmms;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** End-to-end: login issues a JWT, and that JWT is actually enforced per role. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndRbacIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminEmail;
    private String viewerEmail;
    private static final String PASSWORD = "Secret123";

    @BeforeEach
    void setUp() {
        adminEmail = createUser(Role.ADMIN);
        viewerEmail = createUser(Role.VIEWER);
    }

    @Test
    void loginReturnsATokenAndTheCallerIdentity() throws Exception {
        String body = "{\"email\":\"" + adminEmail + "\",\"password\":\"" + PASSWORD + "\"}";

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(adminEmail))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void wrongPasswordIsRejectedWithAJson401() throws Exception {
        String body = "{\"email\":\"" + adminEmail + "\",\"password\":\"nope\"}";

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void protectedEndpointsRequireAToken() throws Exception {
        mockMvc.perform(get("/api/v1/machines"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void viewerCanReadButCannotWrite() throws Exception {
        String viewerToken = login(viewerEmail);

        mockMvc.perform(get("/api/v1/machines").header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/audit").header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/machines")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nope\",\"code\":\"NOPE-1\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateAMachine() throws Exception {
        String adminToken = login(adminEmail);

        mockMvc.perform(post("/api/v1/machines")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Lathe L1\",\"code\":\"LTH-" + System.nanoTime() + "\","
                                + "\"location\":\"Bay E\",\"serviceIntervalDays\":60}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPERATIONAL"));
    }

    @Test
    void aTamperedTokenIsRejected() throws Exception {
        String token = login(adminEmail);

        mockMvc.perform(get("/api/v1/machines").header("Authorization", "Bearer " + token + "x"))
                .andExpect(status().isUnauthorized());
    }

    private String login(String email) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}";
        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }

    private String createUser(Role role) {
        User user = new User();
        user.setName(role.name().toLowerCase() + " user");
        user.setEmail(role.name().toLowerCase() + "-" + System.nanoTime() + "@mainspring.test");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        return userRepository.save(user).getEmail();
    }
}
