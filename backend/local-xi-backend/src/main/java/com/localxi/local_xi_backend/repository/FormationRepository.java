package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Formation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FormationRepository extends JpaRepository<Formation, Long> {
    List<Formation> findAllByTeamId(Long teamId);
}
