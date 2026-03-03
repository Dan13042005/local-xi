package com.localxi.local_xi_backend.config;

import com.localxi.local_xi_backend.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // allow preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // allow all auth endpoints
                .requestMatchers("/api/auth/**").permitAll()

                // read access for logged-in users
                .requestMatchers(HttpMethod.GET, "/api/**").hasAnyRole("PLAYER", "MANAGER")

                // write access only for managers
                .requestMatchers(HttpMethod.POST, "/api/**").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/**").hasRole("MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("MANAGER")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
