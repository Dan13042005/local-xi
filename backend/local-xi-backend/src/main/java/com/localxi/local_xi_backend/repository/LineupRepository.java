package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Lineup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LineupRepository extends JpaRepository<Lineup, Long> {

    Optional<Lineup> findByMatchId(Long matchId);

    // ✅ NEW: bulk lookup for summaries
    List<Lineup> findByMatchIdIn(List<Long> matchIds);
}



