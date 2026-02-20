package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    Optional<Player> findByNumber(int number);
    boolean existsByNumber(int number);
}
