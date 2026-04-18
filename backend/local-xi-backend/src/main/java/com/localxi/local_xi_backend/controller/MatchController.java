package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Match;
import com.localxi.local_xi_backend.repository.MatchRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
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
        return repo.findAllByTeamId(getTeamId());
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

        match.setTeamId(getTeamId());
        Match saved = repo.save(match);
        return ResponseEntity.ok(saved);
    }

    public static class MatchPatch {
        public LocalDate date;
        public String opponent;
        public Boolean home;
        public Integer goalsFor;
        public Integer goalsAgainst;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMatch(@PathVariable Long id, @RequestBody MatchPatch patch) {
        return repo.findById(id)
                .map(existing -> {
                    if (patch.date != null) existing.setDate(patch.date);
                    if (patch.opponent != null) existing.setOpponent(patch.opponent);
                    if (patch.home != null) existing.setHome(patch.home);

                    existing.setGoalsFor(patch.goalsFor);
                    existing.setGoalsAgainst(patch.goalsAgainst);

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

    public static class IdsRequest {
        public List<Long> ids;
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody IdsRequest request) {
        if (request == null || request.ids == null || request.ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No ids provided");
        }
        repo.deleteAllById(request.ids);
        return ResponseEntity.ok().build();
    }

    private Long getTeamId() {
        String principal = (String) SecurityContextHolder
            .getContext().getAuthentication().getPrincipal();
        return Long.valueOf(principal.split(":")[1]);
    }
}




