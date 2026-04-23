package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.AppUser;
import com.localxi.local_xi_backend.model.Role;
import com.localxi.local_xi_backend.repository.AppUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/users")
public class UserAdminController {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    public UserAdminController(AppUserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public static class CreateUserRequest {
        public String email;
        public String password;
        public String role; // optional; default PLAYER
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest req) {

        // principal is stored as "userId:teamId" by JwtAuthFilter
        String principal =
                (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        Long managerUserId = Long.valueOf(principal.split(":")[0]);

        var managerOpt = users.findById(managerUserId);
        if (managerOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        var manager = managerOpt.get();

        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("email and password are required");
        }

        if (req.password.length() < 8) {
            return ResponseEntity.badRequest().body("password must be at least 8 characters");
        }

        String email = req.email.trim().toLowerCase();

        if (users.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("email already exists");
        }

        Role role = Role.PLAYER;
        if (req.role != null && !req.role.isBlank()) {
            role = Role.valueOf(req.role.trim().toUpperCase());
        }

        // New user belongs to the manager's team
        AppUser newUser = new AppUser();
        newUser.setTeam(manager.getTeam());
        newUser.setEmail(email);
        newUser.setPasswordHash(encoder.encode(req.password));
        newUser.setRole(role);

        AppUser saved = users.save(newUser);

        return ResponseEntity.ok(saved.getId());
    }
}
