package com.localxi.local_xi_backend.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class FormationSlot {

    private String position; // "GK", "CB", etc
    private Long playerId;   // nullable (unassigned)

    public FormationSlot() {}

    public FormationSlot(String position, Long playerId) {
        this.position = position;
        this.playerId = playerId;
    }

    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }
}
