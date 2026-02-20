package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.repository.LineupPlayerStatRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/player-stats")
public class PlayerStatsController {

    private final LineupPlayerStatRepository repo;

    public PlayerStatsController(LineupPlayerStatRepository repo) {
        this.repo = repo;
    }

    // GET /api/player-stats/{playerId}/totals
    @GetMapping("/{playerId}/totals")
    public ResponseEntity<?> totals(@PathVariable Long playerId) {
        Object[] row = repo.totalsForPlayer(playerId);

        Map<String, Object> out = new HashMap<>();
        out.put("playerId", playerId);
        out.put("goals", ((Number) row[0]).intValue());
        out.put("assists", ((Number) row[1]).intValue());
        out.put("yellowCards", ((Number) row[2]).intValue());
        out.put("redCards", ((Number) row[3]).intValue());

        return ResponseEntity.ok(out);
    }
}