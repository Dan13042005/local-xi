package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.MatchEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchEventRepository extends JpaRepository<MatchEvent, Long> {
    List<MatchEvent> findByMatchIdOrderByMinuteAscIdAsc(Long matchId);
    void deleteByMatchId(Long matchId);
}