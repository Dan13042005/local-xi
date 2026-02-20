package com.localxi.local_xi_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_slot")
public class LineupSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g. "DEF-1", "MID-3" (stable id)
    @Column(name = "slot_id", nullable = false)
    private String slotId;

    // e.g. "LB", "CM", "ST"
    @Column(nullable = false)
    private String pos;

    // nullable (empty slot allowed)
    @Column(name = "player_id")
    private Long playerId;

    @Column(name = "is_captain", nullable = false)
    private boolean isCaptain = false;

    // rating out of 10 (nullable), supports decimals
    @Column
    private Double rating;

    // ✅ Match events (nullable -> treat as 0 in UI)
    @Column
    private Integer goals;

    @Column
    private Integer assists;

    @Column(name = "yellow_cards")
    private Integer yellowCards;

    @Column(name = "red_cards")
    private Integer redCards;

    @JsonBackReference(value = "lineup-slots")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_id", nullable = false)
    private Lineup lineup;

    public LineupSlot() {}

    public Long getId() { return id; }

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }

    public String getPos() { return pos; }
    public void setPos(String pos) { this.pos = pos; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public boolean isCaptain() { return isCaptain; }
    public void setCaptain(boolean captain) { isCaptain = captain; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getGoals() { return goals; }
    public void setGoals(Integer goals) { this.goals = goals; }

    public Integer getAssists() { return assists; }
    public void setAssists(Integer assists) { this.assists = assists; }

    public Integer getYellowCards() { return yellowCards; }
    public void setYellowCards(Integer yellowCards) { this.yellowCards = yellowCards; }

    public Integer getRedCards() { return redCards; }
    public void setRedCards(Integer redCards) { this.redCards = redCards; }

    public Lineup getLineup() { return lineup; }
    public void setLineup(Lineup lineup) { this.lineup = lineup; }
}



