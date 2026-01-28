package com.localxi.local_xi_backend.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "players")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private int number;

    @ElementCollection
    @CollectionTable(name = "player_positions", joinColumns = @JoinColumn(name = "player_id"))
    @Column(name = "position")
    private List<String> positions;

    public Player() {}

    public Player(Long id, String name, List<String> positions, int number) {
        this.id = id;
        this.name = name;
        this.positions = positions;
        this.number = number;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getPositions() { return positions; }
    public void setPositions(List<String> positions) { this.positions = positions; }

    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
}
