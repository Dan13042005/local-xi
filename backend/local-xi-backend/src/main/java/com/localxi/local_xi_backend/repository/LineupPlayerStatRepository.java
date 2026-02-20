package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.LineupPlayerStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LineupPlayerStatRepository extends JpaRepository<LineupPlayerStat, Long> {

    @Query("""
        select
          coalesce(sum(s.goals), 0),
          coalesce(sum(s.assists), 0),
          coalesce(sum(s.yellowCards), 0),
          coalesce(sum(s.redCards), 0)
        from LineupPlayerStat s
        where s.playerId = :playerId
    """)
    Object totalsForPlayer(@Param("playerId") Long playerId);
}
