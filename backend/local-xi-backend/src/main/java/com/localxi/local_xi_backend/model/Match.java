package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String opponent;
    private boolean home; // true = home, false = away
    private Integer goalsFor;
    private Integer goalsAgainst;

    public Match() {}

    public Match(Long id, LocalDate date, String opponent, boolean home, Integer goalsFor, Integer goalsAgainst) {
        this.id = id;
        this.date = date;
        this.opponent = opponent;
        this.home = home;
        this.goalsFor = goalsFor;
        this.goalsAgainst = goalsAgainst;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getOpponent() { return opponent; }
    public void setOpponent(String opponent) { this.opponent = opponent; }

    public boolean isHome() { return home; }
    public void setHome(boolean home) { this.home = home; }

    public Integer getGoalsFor() { return goalsFor; }
    public void setGoalsFor(Integer goalsFor) { this.goalsFor = goalsFor; }

    public Integer getGoalsAgainst() { return goalsAgainst; }
    public void setGoalsAgainst(Integer goalsAgainst) { this.goalsAgainst = goalsAgainst; }
}
