package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.repository.LineupPlayerStatRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/player-stats")
public class PlayerStatsController {

    private final LineupPlayerStatRepository statsRepo;

    public PlayerStatsController(LineupPlayerStatRepository statsRepo) {
        this.statsRepo = statsRepo;
    }

    // GET /api/player-stats/{playerId}/totals
    @GetMapping("/{playerId}/totals")
    public ResponseEntity<?> totals(@PathVariable Long playerId) {

        Object raw = statsRepo.totalsForPlayer(playerId);

        // JPA returns a single row as Object[] for multi-select queries
        Object[] row = (raw instanceof Object[]) ? (Object[]) raw : new Object[] {0, 0, 0, 0};

        int goals = toInt(row, 0);
        int assists = toInt(row, 1);
        int yellowCards = toInt(row, 2);
        int redCards = toInt(row, 3);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("playerId", playerId);
        out.put("goals", goals);
        out.put("assists", assists);
        out.put("yellowCards", yellowCards);
        out.put("redCards", redCards);

        return ResponseEntity.ok(out);
    }

    private static int toInt(Object[] row, int idx) {
        if (row == null || row.length <= idx || row[idx] == null) return 0;
        Object v = row[idx];
        if (v instanceof Number n) return n.intValue();
        // defensive fallback (shouldn't normally happen)
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception ignored) {
            return 0;
        }
    }
}