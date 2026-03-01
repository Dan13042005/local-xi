package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notice")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id")
    private AppUser createdBy;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Notice() {}

    public Long getId() { return id; }
    public Team getTeam() { return team; }
    public AppUser getCreatedBy() { return createdBy; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setTeam(Team team) { this.team = team; }
    public void setCreatedBy(AppUser createdBy) { this.createdBy = createdBy; }
    public void setTitle(String title) { this.title = title; }
    public void setBody(String body) { this.body = body; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
