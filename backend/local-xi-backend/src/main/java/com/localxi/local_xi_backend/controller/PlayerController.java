package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Player;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.DELETE, RequestMethod.OPTIONS}
)
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final List<Player> players = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    // GET all players
    @GetMapping
    public List<Player> getPlayers() {
        return players;
    }

    // CREATE player
    @PostMapping
    public ResponseEntity<?> createPlayer(@RequestBody Player player) {

        if (player.getName() == null || player.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }

        if (player.getPositions() == null || player.getPositions().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one position is required");
        }

        if (player.getNumber() < 1 || player.getNumber() > 99) {
            return ResponseEntity.badRequest().body("Shirt number must be 1–99");
        }

        // prevent duplicate shirt number
        boolean taken = players.stream().anyMatch(p -> p.getNumber() == player.getNumber());
        if (taken) {
            return ResponseEntity.badRequest().body("Shirt number already taken");
        }

        player.setId(idCounter.getAndIncrement());
        players.add(player);
        return ResponseEntity.ok(player);
    }

    // BULK DELETE
    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody IdsRequest request) {
        if (request == null || request.ids == null || request.ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No ids provided");
        }

        Set<Long> toDelete = new HashSet<>(request.ids);
        players.removeIf(p -> p.getId() != null && toDelete.contains(p.getId()));

        return ResponseEntity.ok().build();
    }

    public static class IdsRequest {
        public List<Long> ids;
    }
}



