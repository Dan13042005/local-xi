package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Player;
import com.localxi.local_xi_backend.repository.PlayerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerRepository repo;

    public PlayerController(PlayerRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Player> getAll() {
        List<Player> out = repo.findAll();
        out.sort(Comparator.comparingInt(Player::getNumber));
        return out;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Player payload) {
        if (payload.getName() == null || payload.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("name is required");
        }
        if (payload.getPositions() == null || payload.getPositions().isEmpty()) {
            return ResponseEntity.badRequest().body("positions are required");
        }
        if (payload.getNumber() < 1 || payload.getNumber() > 99) {
            return ResponseEntity.badRequest().body("number must be 1–99");
        }
        if (repo.existsByNumber(payload.getNumber())) {
            return ResponseEntity.badRequest().body("shirt number already exists");
        }

        Player p = new Player();
        p.setName(payload.getName().trim());
        p.setPositions(payload.getPositions());
        p.setNumber(payload.getNumber());

        return ResponseEntity.ok(repo.save(p));
    }

    // DELETE /api/players   body: [1,2,3]
    @DeleteMapping
    public ResponseEntity<?> deleteMany(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body("ids are required");
        }

        List<Player> existing = repo.findAllById(ids);
        if (!existing.isEmpty()) {
            repo.deleteAll(existing);
        }
        return ResponseEntity.ok().build();
    }
}



