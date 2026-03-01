package com.localxi.local_xi_backend.config;

import com.localxi.local_xi_backend.model.AppUser;
import com.localxi.local_xi_backend.model.Role;
import com.localxi.local_xi_backend.model.Team;
import com.localxi.local_xi_backend.repository.AppUserRepository;
import com.localxi.local_xi_backend.repository.TeamRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SeedDataConfig {

    @Bean
    CommandLineRunner seed(TeamRepository teams, AppUserRepository users, PasswordEncoder encoder) {
        return args -> {
            Team team = teams.findByName("Demo FC").orElseGet(() -> teams.save(new Team("Demo FC")));

            String managerEmail = "manager@demofc.com";
            if (!users.existsByEmail(managerEmail)) {
                AppUser m = new AppUser();
                m.setTeam(team);
                m.setEmail(managerEmail);
                m.setPasswordHash(encoder.encode("manager123"));
                m.setRole(Role.MANAGER);
                users.save(m);
            }
        };
    }
}