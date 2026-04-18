package com.localxi.local_xi_backend.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "formations")
public class Formation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String shape; // e.g. "4-4-2"

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "formation_slots", joinColumns = @JoinColumn(name = "formation_id"))
    private List<FormationSlot> slots = new ArrayList<>();

    public Formation() {}

    public Formation(String name, String shape, List<FormationSlot> slots) {
        this.name = name;
        this.shape = shape;
        this.slots = slots;
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getShape() { return shape; }
    public void setShape(String shape) { this.shape = shape; }

    public List<FormationSlot> getSlots() { return slots; }
    public void setSlots(List<FormationSlot> slots) { this.slots = slots; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
}
