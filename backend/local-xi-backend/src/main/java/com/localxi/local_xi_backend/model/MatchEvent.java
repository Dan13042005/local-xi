package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "match_event")
public class MatchEvent {

    public enum EventType {
        GOAL,
        YELLOW,
        RED,
        SUB
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // we store matchId as a plain FK column (no relation needed)
    @Column(name = "match_id", nullable = false)
    private Long matchId;

    // ✅ FIX: "minute" is reserved in H2, so use a safer column name
    @Column(name = "event_minute", nullable = false)
    private Integer minute;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private EventType type;

    // Main player (scorer / booked / sub ON)
    @Column(name = "player_id")
    private Long playerId;

    // Related player (assist OR sub OFF)
    @Column(name = "related_player_id")
    private Long relatedPlayerId;

    @Column(length = 255)
    private String note;

    public MatchEvent() {}

    public Long getId() { return id; }

    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }

    public Integer getMinute() { return minute; }
    public void setMinute(Integer minute) { this.minute = minute; }

    public EventType getType() { return type; }
    public void setType(EventType type) { this.type = type; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Long getRelatedPlayerId() { return relatedPlayerId; }
    public void setRelatedPlayerId(Long relatedPlayerId) { this.relatedPlayerId = relatedPlayerId; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
