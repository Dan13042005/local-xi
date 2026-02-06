package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Lineup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1 lineup per match (enforced in DB with unique constraint)
    @Column(nullable = false, unique = true)
    private Long matchId;

    @Column(nullable = false)
    private String formationName; // "4-4-2", "4-3-3", etc

    // For later (captain per match)
    private Long captainPlayerId; // nullable for now

    @OneToMany(mappedBy = "lineup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LineupSlot> slots = new ArrayList<>();

    public Lineup() {}

    public Long getId() { return id; }

    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }

    public String getFormationName() { return formationName; }
    public void setFormationName(String formationName) { this.formationName = formationName; }

    public Long getCaptainPlayerId() { return captainPlayerId; }
    public void setCaptainPlayerId(Long captainPlayerId) { this.captainPlayerId = captainPlayerId; }

    public List<LineupSlot> getSlots() { return slots; }
    public void setSlots(List<LineupSlot> slots) { this.slots = slots; }
}
