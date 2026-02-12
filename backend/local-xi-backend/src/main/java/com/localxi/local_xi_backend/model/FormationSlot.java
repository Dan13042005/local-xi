package com.localxi.local_xi_backend.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class FormationSlot {

    // ✅ stable id used by lineup slots, e.g. "GK-1", "DEF-1", "MID-3"
    private String slotId;

    // label shown in UI e.g. "GK", "LB", "CB"
    private String position;

    // optional (you can keep this for later or ignore it)
    private Long playerId; // nullable (unassigned)

    public FormationSlot() {}

    public FormationSlot(String slotId, String position, Long playerId) {
        this.slotId = slotId;
        this.position = position;
        this.playerId = playerId;
    }

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }

    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }
}


