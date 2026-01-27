package com.localxi.local_xi_backend.model;

import java.util.List;

public class Player {

    private Long id;
    private String name;
    private List<String> positions;
    private int number;

    public Player() {}

    public Player(Long id, String name, List<String> positions, int number) {
        this.id = id;
        this.name = name;
        this.positions = positions;
        this.number = number;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getPositions() {
        return positions;
    }

    public void setPositions(List<String> positions) {
        this.positions = positions;
    }

    public int getNumber() {
        return number;
    }

    public void setNumber(int number) {
        this.number = number;
    }
}

