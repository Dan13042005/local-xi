package com.localxi.local_xi_backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "lineup",
        uniqueConstraints = @UniqueConstraint(columnNames = {"match_id"})
)
public class Lineup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1 lineup per match
    @Column(name = "match_id", nullable = false, unique = true)
    private Long matchId;

    // e.g. "4-4-2", "4-3-3", "4-2-3-1"
    @Column(name = "formation_name", nullable = false)
    private String formationName;

    // for later (captain per match) - nullable for now
    @Column(name = "captain_player_id")
    private Long captainPlayerId;

    @JsonManagedReference
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

