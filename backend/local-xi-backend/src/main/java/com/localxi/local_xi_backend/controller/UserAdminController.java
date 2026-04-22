package com.localxi.local_xi_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.localxi.local_xi_backend.model.AppUser;
import com.localxi.local_xi_backend.model.Role;
import com.localxi.local_xi_backend.repository.AppUserRepository;

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

        // userId stored as principal by JwtAuthFilter
        String managerUserIdStr =
                (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        Long managerUserId = Long.valueOf(managerUserIdStr.split(":")[0]);

        var managerOpt = users.findById(managerUserId);
        if (managerOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        var manager = managerOpt.get();

        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("email and password are required");
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
