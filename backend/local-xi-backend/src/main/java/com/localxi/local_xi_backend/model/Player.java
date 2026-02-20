package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "player")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // store list of positions in a separate join table
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "player_positions",
            joinColumns = @JoinColumn(name = "player_id")
    )
    @Column(name = "position", nullable = false)
    private List<String> positions = new ArrayList<>();

    @Column(nullable = false, unique = true)
    private int number;

    public Player() {}

    public Player(Long id, String name, List<String> positions, int number) {
        this.id = id;
        this.name = name;
        this.positions = positions != null ? positions : new ArrayList<>();
        this.number = number;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getPositions() { return positions; }
    public void setPositions(List<String> positions) {
        this.positions = positions != null ? positions : new ArrayList<>();
    }

    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
}

