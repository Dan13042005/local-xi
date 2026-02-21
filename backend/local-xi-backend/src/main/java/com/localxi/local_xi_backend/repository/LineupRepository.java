package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Lineup;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LineupRepository extends JpaRepository<Lineup, Long> {

    // original (keep if you want)
    Optional<Lineup> findByMatchId(Long matchId);

    List<Lineup> findAllByMatchIdIn(List<Long> ids);

    // ✅ Use this for GET + PUT to avoid lazy issues and to work with existing children
    @Query("""
        select distinct l
        from Lineup l
        left join fetch l.slots
        left join fetch l.playerStats
        where l.matchId = :matchId
    """)
    Optional<Lineup> findByMatchIdWithDetails(@Param("matchId") Long matchId);
}






