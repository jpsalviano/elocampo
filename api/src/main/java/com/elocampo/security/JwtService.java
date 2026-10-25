package com.elocampo.security;

import com.elocampo.config.ElocampoProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final int hours;

    public JwtService(ElocampoProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.hours = properties.tokenHours();
    }

    // As claims além do subject só servem para a web montar os menus; a API
    // confia apenas no subject e lê o resto do banco.
    public String issue(String userId, String email, boolean admin) {
        var now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("isAdmin", admin)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(hours, ChronoUnit.HOURS)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Optional<String> subject(String token) {
        try {
            return Optional.ofNullable(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
