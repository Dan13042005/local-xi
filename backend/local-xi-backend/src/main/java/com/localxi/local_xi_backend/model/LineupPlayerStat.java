package com.localxi.local_xi_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(
        name = "lineup_player_stat",
        uniqueConstraints = @UniqueConstraint(columnNames = {"lineup_id", "player_id"})
)
public class LineupPlayerStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK to lineup
    @JsonBackReference(value = "lineup-stats")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_id", nullable = false)
    private Lineup lineup;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column
    private Integer goals;

    @Column
    private Integer assists;

    @Column(name = "yellow_cards")
    private Integer yellowCards;

    @Column(name = "red_cards")
    private Integer redCards;

    public LineupPlayerStat() {}

    public Long getId() { return id; }

    public Lineup getLineup() { return lineup; }
    public void setLineup(Lineup lineup) { this.lineup = lineup; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Integer getGoals() { return goals; }
    public void setGoals(Integer goals) { this.goals = goals; }

    public Integer getAssists() { return assists; }
    public void setAssists(Integer assists) { this.assists = assists; }

    public Integer getYellowCards() { return yellowCards; }
    public void setYellowCards(Integer yellowCards) { this.yellowCards = yellowCards; }

    public Integer getRedCards() { return redCards; }
    public void setRedCards(Integer redCards) { this.redCards = redCards; }
}
