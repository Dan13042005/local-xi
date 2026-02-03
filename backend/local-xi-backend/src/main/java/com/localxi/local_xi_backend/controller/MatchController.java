package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Match;
import com.localxi.local_xi_backend.repository.MatchRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchRepository repo;

    public MatchController(MatchRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Match> getMatches() {
        return repo.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createMatch(@RequestBody Match match) {
        // ✅ LocalDate cannot be trimmed — only check for null
        if (match.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required");
        }

        if (match.getOpponent() == null || match.getOpponent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Opponent is required");
        }

        if (match.getGoalsFor() != null && match.getGoalsFor() < 0) {
            return ResponseEntity.badRequest().body("Goals For must be 0 or more");
        }

        if (match.getGoalsAgainst() != null && match.getGoalsAgainst() < 0) {
            return ResponseEntity.badRequest().body("Goals Against must be 0 or more");
        }

        Match saved = repo.save(match);
        return ResponseEntity.ok(saved);
    }

    // ✅ update match (used for mark-as-played + edit)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateMatch(@PathVariable Long id, @RequestBody Match patch) {
        return repo.findById(id)
                .map(existing -> {
                    // apply patch
                    if (patch.getDate() != null) existing.setDate(patch.getDate());
                    if (patch.getOpponent() != null) existing.setOpponent(patch.getOpponent());

                    // boolean always comes through - if you want patch-style boolean too, tell me
                    existing.setHome(patch.isHome());

                    existing.setGoalsFor(patch.getGoalsFor());
                    existing.setGoalsAgainst(patch.getGoalsAgainst());

                    // ✅ validate after applying
                    if (existing.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required");
                    }

                    if (existing.getOpponent() == null || existing.getOpponent().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Opponent is required");
                    }

                    if (existing.getGoalsFor() != null && existing.getGoalsFor() < 0) {
                        return ResponseEntity.badRequest().body("Goals For must be 0 or more");
                    }

                    if (existing.getGoalsAgainst() != null && existing.getGoalsAgainst() < 0) {
                        return ResponseEntity.badRequest().body("Goals Against must be 0 or more");
                    }

                    Match saved = repo.save(existing);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

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



