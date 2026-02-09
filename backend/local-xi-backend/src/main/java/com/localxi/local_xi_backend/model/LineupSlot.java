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

    // future feature
    @Column(name = "is_captain", nullable = false)
    private boolean isCaptain = false;

    // rating out of 10 (nullable)
    @Column
    private Integer rating;

    @JsonBackReference
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

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public Lineup getLineup() { return lineup; }
    public void setLineup(Lineup lineup) { this.lineup = lineup; }
}


