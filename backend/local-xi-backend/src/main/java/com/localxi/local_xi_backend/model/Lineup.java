package com.localxi.local_xi_backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lineup")
public class Lineup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1 lineup per match (enforced in DB with unique constraint)
    @Column(nullable = false, unique = true)
    private Long matchId;

    // formation reference
    @Column(nullable = false)
    private Long formationId;

    // captain player id (nullable ok)
    private Long captainPlayerId;

    // ✅ Slots (existing)
    @JsonManagedReference
    @OneToMany(mappedBy = "lineup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LineupSlot> slots = new ArrayList<>();

    // ✅ Option 1: per-player match stats stored separately
    @JsonManagedReference(value = "lineup-stats")
    @OneToMany(mappedBy = "lineup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LineupPlayerStat> playerStats = new ArrayList<>();

    public Lineup() {}

    public Long getId() { return id; }

    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }

    public Long getFormationId() { return formationId; }
    public void setFormationId(Long formationId) { this.formationId = formationId; }

    public Long getCaptainPlayerId() { return captainPlayerId; }
    public void setCaptainPlayerId(Long captainPlayerId) { this.captainPlayerId = captainPlayerId; }

    public List<LineupSlot> getSlots() { return slots; }
    public void setSlots(List<LineupSlot> slots) { this.slots = slots; }

    public List<LineupPlayerStat> getPlayerStats() { return playerStats; }
    public void setPlayerStats(List<LineupPlayerStat> playerStats) { this.playerStats = playerStats; }
}


