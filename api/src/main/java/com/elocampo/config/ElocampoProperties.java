package com.elocampo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;

@ConfigurationProperties(prefix = "elocampo")
public record ElocampoProperties(
        String jwtSecret,
        Integer tokenHours,
        String filesRoot,
        String demoPassword,
        String demoResetCron,
        String demoZone
) {

    public ElocampoProperties {
        if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("ELOCAMPO_JWT_SECRET must have at least 32 bytes");
        }
        if (tokenHours == null) {
            tokenHours = 12;
        }
    }

    public boolean demoEnabled() {
        return demoPassword != null && !demoPassword.isBlank();
    }
}
