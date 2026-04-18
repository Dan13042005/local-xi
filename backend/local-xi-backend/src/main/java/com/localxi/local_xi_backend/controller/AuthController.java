package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.AppUser;
import com.localxi.local_xi_backend.model.Role;
import com.localxi.local_xi_backend.model.Team;
import com.localxi.local_xi_backend.repository.AppUserRepository;
import com.localxi.local_xi_backend.repository.TeamRepository;
import com.localxi.local_xi_backend.security.JwtService;
import com.localxi.local_xi_backend.security.LoginRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository users;
    private final TeamRepository teamRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginRateLimiter limiter;

    public AuthController(AppUserRepository users, TeamRepository teamRepo,
                          PasswordEncoder encoder, JwtService jwt, LoginRateLimiter limiter) {
        this.users = users;
        this.teamRepo = teamRepo;
        this.encoder = encoder;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class LoginResponse {
        public String token;
        public String role;
        public Long teamId;
        public String email;
        public Long userId;
    }

    public static class RegisterRequest {
        public String teamName;
        public String email;
        public String password;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest httpReq) {
        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("email and password are required");
        }

        String email = req.email.trim().toLowerCase();
        String ip = clientIp(httpReq);

        if (limiter.isLocked(email, ip)) {
            long retryAfter = limiter.secondsUntilUnlock(email, ip);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Retry-After", String.valueOf(retryAfter));

            return ResponseEntity
                    .status(HttpStatus.TOO_MANY_REQUESTS)
                    .headers(headers)
                    .body("Too many failed login attempts. Try again in " + retryAfter + " seconds.");
        }

        var userOpt = users.findByEmail(email);
        if (userOpt.isEmpty()) {
            limiter.recordFailure(email, ip);
            return ResponseEntity.status(401).body("invalid credentials");
        }

        var user = userOpt.get();

        if (!encoder.matches(req.password, user.getPasswordHash())) {
            limiter.recordFailure(email, ip);
            return ResponseEntity.status(401).body("invalid credentials");
        }

        limiter.recordSuccess(email, ip);

        String token = jwt.createToken(user);

        LoginResponse out = new LoginResponse();
        out.token = token;
        out.role = user.getRole().name();
        out.teamId = user.getTeam().getId();
        out.email = user.getEmail();
        out.userId = user.getId();

        return ResponseEntity.ok(out);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req.teamName == null || req.teamName.isBlank() ||
            req.email == null || req.email.isBlank() ||
            req.password == null || req.password.length() < 8) {
            return ResponseEntity.badRequest()
                .body("teamName, email, and password (min 8 chars) are required");
        }

        String email = req.email.trim().toLowerCase();
        if (users.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("email already registered");
        }

        Team team = new Team(req.teamName.trim());
        teamRepo.save(team);

        AppUser manager = new AppUser();
        manager.setEmail(email);
        manager.setPasswordHash(encoder.encode(req.password));
        manager.setRole(Role.MANAGER);
        manager.setTeam(team);
        users.save(manager);

        return ResponseEntity.ok("Team registered successfully");
    }

    private String clientIp(HttpServletRequest req) {
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}