package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchRepository extends JpaRepository<Match, Long> {
}

