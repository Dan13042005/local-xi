package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.repository.AppUserRepository;
import com.localxi.local_xi_backend.security.JwtService;
import org.springframework.http.ResponseEntity;
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
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(AppUserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("email and password are required");
        }

        var userOpt = users.findByEmail(req.email.trim().toLowerCase());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body("invalid credentials");

        var user = userOpt.get();
        if (!encoder.matches(req.password, user.getPasswordHash())) {
            return ResponseEntity.status(401).body("invalid credentials");
        }

        String token = jwt.createToken(user);

        LoginResponse out = new LoginResponse();
        out.token = token;
        out.role = user.getRole().name();
        out.teamId = user.getTeam().getId();
        out.email = user.getEmail();
        out.userId = user.getId();

        return ResponseEntity.ok(out);
    }
}