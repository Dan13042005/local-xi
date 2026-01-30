package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.entity.Player;
import com.localxi.local_xi_backend.repository.PlayerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(
    origins = "http://localhost:5173",
    allowedHeaders = "*",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerRepository repo;

    public PlayerController(PlayerRepository repo) {
        this.repo = repo;
    }

    // GET all players
    @GetMapping
    public List<Player> getPlayers() {
        return repo.findAll();
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

        if (repo.existsByNumber(player.getNumber())) {
            return ResponseEntity.badRequest().body("Shirt number already taken");
        }

        Player saved = repo.save(player);
        return ResponseEntity.ok(saved);
    }

    // BULK DELETE
    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody IdsRequest request) {

        if (request.ids == null || request.ids.isEmpty()) {
        return ResponseEntity.badRequest().body("No ids provided");
        }

        repo.deleteAllById(request.ids);
        return ResponseEntity.ok().build();
    }

    public static class IdsRequest {
    public List<Long> ids;
    }

}


