package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
import com.localxi.local_xi_backend.model.LineupPlayerStat;
import com.localxi.local_xi_backend.model.LineupSlot;
import com.localxi.local_xi_backend.repository.LineupRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/lineups")
public class LineupController {

    private final LineupRepository repo;

    public LineupController(LineupRepository repo) {
        this.repo = repo;
    }

    // GET /api/lineups/match/{matchId}
    @GetMapping("/match/{matchId}")
    public ResponseEntity<?> getLineupForMatch(@PathVariable Long matchId) {
        return repo.findByMatchId(matchId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body("No lineup for match " + matchId));
    }

    // PUT /api/lineups/match/{matchId}
    @PutMapping("/match/{matchId}")
    public ResponseEntity<?> upsertForMatch(@PathVariable Long matchId, @RequestBody Lineup payload) {

        if (payload.getFormationId() == null) {
            return ResponseEntity.badRequest().body("formationId is required");
        }
        if (payload.getSlots() == null) {
            return ResponseEntity.badRequest().body("slots are required");
        }

        Lineup lineup = repo.findByMatchId(matchId).orElseGet(Lineup::new);

        lineup.setMatchId(matchId);
        lineup.setFormationId(payload.getFormationId());
        lineup.setCaptainPlayerId(payload.getCaptainPlayerId()); // nullable ok

        // ----------------------------
        // Replace slots (same as before)
        // ----------------------------
        lineup.getSlots().clear();
        for (LineupSlot s : payload.getSlots()) {
            if (s.getSlotId() == null || s.getSlotId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("slotId is required");
            }
            if (s.getPos() == null || s.getPos().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("pos is required");
            }

            LineupSlot slot = new LineupSlot();
            slot.setLineup(lineup);
            slot.setSlotId(s.getSlotId());
            slot.setPos(s.getPos());
            slot.setPlayerId(s.getPlayerId());
            slot.setCaptain(s.isCaptain());
            slot.setRating(s.getRating());

            // ✅ Keep these for backwards compatibility if your frontend still sends them.
            // They are NOT the source of truth anymore once you use playerStats.
            slot.setGoals(s.getGoals());
            slot.setAssists(s.getAssists());
            slot.setYellowCards(s.getYellowCards());
            slot.setRedCards(s.getRedCards());

            lineup.getSlots().add(slot);
        }

        // --------------------------------------------
        // ✅ Option 1: Replace playerStats (by playerId)
        // --------------------------------------------
        // If payload.playerStats exists, that becomes the source of truth.
        // If it doesn't exist, we can optionally derive stats from slots (legacy).
        lineup.getPlayerStats().clear();

        if (payload.getPlayerStats() != null && !payload.getPlayerStats().isEmpty()) {
            for (LineupPlayerStat ps : payload.getPlayerStats()) {
                if (ps.getPlayerId() == null) {
                    return ResponseEntity.badRequest().body("playerStats.playerId is required");
                }

                LineupPlayerStat stat = new LineupPlayerStat();
                stat.setLineup(lineup);
                stat.setPlayerId(ps.getPlayerId());
                stat.setGoals(ps.getGoals());
                stat.setAssists(ps.getAssists());
                stat.setYellowCards(ps.getYellowCards());
                stat.setRedCards(ps.getRedCards());

                lineup.getPlayerStats().add(stat);
            }
        } else {
            // Legacy fallback: derive per-player stats from slots (only if present)
            // This makes older payloads still persist into the new table.
            Map<Long, LineupPlayerStat> byPlayer = new HashMap<>();
            for (LineupSlot s : payload.getSlots()) {
                if (s.getPlayerId() == null) continue;

                LineupPlayerStat stat = byPlayer.computeIfAbsent(s.getPlayerId(), pid -> {
                    LineupPlayerStat x = new LineupPlayerStat();
                    x.setLineup(lineup);
                    x.setPlayerId(pid);
                    x.setGoals(0);
                    x.setAssists(0);
                    x.setYellowCards(0);
                    x.setRedCards(0);
                    return x;
                });

                stat.setGoals((stat.getGoals() == null ? 0 : stat.getGoals()) + n0(s.getGoals()));
                stat.setAssists((stat.getAssists() == null ? 0 : stat.getAssists()) + n0(s.getAssists()));
                stat.setYellowCards((stat.getYellowCards() == null ? 0 : stat.getYellowCards()) + n0(s.getYellowCards()));
                stat.setRedCards((stat.getRedCards() == null ? 0 : stat.getRedCards()) + n0(s.getRedCards()));
            }
            lineup.getPlayerStats().addAll(byPlayer.values());
        }

        return ResponseEntity.ok(repo.save(lineup));
    }

    private int n0(Integer v) {
        return v == null ? 0 : Math.max(0, v);
    }

    // POST /api/lineups/summaries   { "ids": [1,2,3] }
    // returns: [{ "matchId": 1, "formationId": 5 }, ...]
    @PostMapping("/summaries")
    public ResponseEntity<?> getSummaries(@RequestBody IdsRequest request) {
        if (request == null || request.ids == null) {
            return ResponseEntity.badRequest().body("ids are required");
        }
        if (request.ids.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Lineup> lineups = repo.findAllByMatchIdIn(request.ids);

        List<LineupSummary> out = lineups.stream()
                .map(l -> new LineupSummary(l.getMatchId(), l.getFormationId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(out);
    }

    public static class IdsRequest {
        public List<Long> ids;
    }

    public static class LineupSummary {
        public Long matchId;
        public Long formationId;

        public LineupSummary(Long matchId, Long formationId) {
            this.matchId = matchId;
            this.formationId = formationId;
        }
    }
}













