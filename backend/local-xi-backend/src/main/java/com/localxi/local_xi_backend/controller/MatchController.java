package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Match;
import com.localxi.local_xi_backend.repository.MatchRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.DELETE}
)
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
        if (match.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (match.getOpponent() == null || match.getOpponent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Opponent is required.");
        }

        // goals can be null (e.g. fixture not played yet), but if present must be >= 0
        if (match.getGoalsFor() != null && match.getGoalsFor() < 0) {
            return ResponseEntity.badRequest().body("Goals for must be 0 or more.");
        }

        if (match.getGoalsAgainst() != null && match.getGoalsAgainst() < 0) {
            return ResponseEntity.badRequest().body("Goals against must be 0 or more.");
        }

        Match saved = repo.save(match);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody IdsRequest request) {
        if (request.ids == null || request.ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No ids provided.");
        }
        repo.deleteAllById(request.ids);
        return ResponseEntity.ok().build();
    }

    public static class IdsRequest {
        public List<Long> ids;
    }
}

