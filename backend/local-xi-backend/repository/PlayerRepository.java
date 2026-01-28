package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    boolean existsByNumber(int number);
}
