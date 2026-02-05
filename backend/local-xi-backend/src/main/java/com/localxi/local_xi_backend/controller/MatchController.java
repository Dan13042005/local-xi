package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Match;
import com.localxi.local_xi_backend.repository.MatchRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    // ✅ Patch DTO (safer than binding directly to Match)
    public static class MatchPatch {
        public LocalDate date;          // must be "YYYY-MM-DD" if sent
        public String opponent;
        public Boolean home;            // Boolean (nullable) so omitted doesn’t become false
        public Integer goalsFor;         // nullable allowed
        public Integer goalsAgainst;     // nullable allowed
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMatch(@PathVariable Long id, @RequestBody MatchPatch patch) {
        return repo.findById(id)
                .map(existing -> {
                    // apply patch fields only if provided
                    if (patch.date != null) existing.setDate(patch.date);
                    if (patch.opponent != null) existing.setOpponent(patch.opponent);
                    if (patch.home != null) existing.setHome(patch.home);
                    if (patch.goalsFor != null || patch.goalsFor == null) existing.setGoalsFor(patch.goalsFor);
                    if (patch.goalsAgainst != null || patch.goalsAgainst == null) existing.setGoalsAgainst(patch.goalsAgainst);

                    // validate final state
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




