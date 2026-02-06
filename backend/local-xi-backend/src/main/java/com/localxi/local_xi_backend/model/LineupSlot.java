package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;

@Entity
public class LineupSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Lineup lineup;

    @Column(nullable = false)
    private String slotId; // "MID-1", "DEF-3", etc

    @Column(nullable = false)
    private String pos; // "LB", "CDM", etc (label)

    private Long playerId; // nullable => unassigned slot

    public LineupSlot() {}

    public Long getId() { return id; }

    public Lineup getLineup() { return lineup; }
    public void setLineup(Lineup lineup) { this.lineup = lineup; }

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }

    public String getPos() { return pos; }
    public void setPos(String pos) { this.pos = pos; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }
}

