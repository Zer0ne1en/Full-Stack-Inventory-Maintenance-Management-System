package com.mainspring.cmms.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger / OpenAPI metadata plus the bearer-token security scheme. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openApi(@Value("${spring.application.name:mainspring-cmms}") String appName) {
        final String schemeName = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Mainspring CMMS API")
                        .version("1.0.0")
                        .description("Inventory & maintenance management REST API. "
                                + "Authenticate with `POST /api/v1/auth/login`, then click **Authorize** "
                                + "and paste the access token.")
                        .contact(new Contact().name("Mainspring").url("https://github.com/Zer0ne1en")))
                .components(new Components().addSecuritySchemes(schemeName,
                        new SecurityScheme()
                                .name(schemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the JWT returned by the login endpoint.")))
                .addSecurityItem(new SecurityRequirement().addList(schemeName));
    }
}
