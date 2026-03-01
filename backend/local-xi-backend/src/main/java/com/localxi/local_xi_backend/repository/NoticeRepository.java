package com.localxi.local_xi_backend.repository;

import com.localxi.local_xi_backend.model.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByTeam_IdOrderByCreatedAtDesc(Long teamId);
}
