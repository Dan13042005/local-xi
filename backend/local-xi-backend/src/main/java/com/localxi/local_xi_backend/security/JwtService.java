package com.localxi.local_xi_backend.security;

import com.localxi.local_xi_backend.model.AppUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final byte[] keyBytes;
    private final int expMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expMinutes:240}") int expMinutes
    ) {
        this.keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expMinutes = expMinutes;
    }

    public String createToken(AppUser user) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expMinutes * 60L);

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("roleId", user.getRole().name())
                .claim("teamId", user.getTeam().getId())
                .signWith(Keys.hmacShaKeyFor(keyBytes))
                .compact();
    }
}
