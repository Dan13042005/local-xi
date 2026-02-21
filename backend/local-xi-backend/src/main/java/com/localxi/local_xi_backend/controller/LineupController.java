package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
import com.localxi.local_xi_backend.model.LineupPlayerStat;
import com.localxi.local_xi_backend.model.LineupSlot;
import com.localxi.local_xi_backend.repository.LineupRepository;
import jakarta.transaction.Transactional;
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
        return repo.findByMatchIdWithDetails(matchId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body("No lineup for match " + matchId));
    }

    // PUT /api/lineups/match/{matchId}
    @PutMapping("/match/{matchId}")
    @Transactional
    public ResponseEntity<?> upsertForMatch(@PathVariable Long matchId, @RequestBody Lineup payload) {

        if (payload.getFormationId() == null) {
            return ResponseEntity.badRequest().body("formationId is required");
        }
        if (payload.getSlots() == null) {
            return ResponseEntity.badRequest().body("slots are required");
        }

        // ✅ load with children so updating stats doesn't hit lazy/serialization issues
        Lineup lineup = repo.findByMatchIdWithDetails(matchId).orElseGet(Lineup::new);

        lineup.setMatchId(matchId);
        lineup.setFormationId(payload.getFormationId());
        lineup.setCaptainPlayerId(payload.getCaptainPlayerId());

        // ----------------------------
        // Replace slots
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

            // legacy fields (optional)
            slot.setGoals(s.getGoals());
            slot.setAssists(s.getAssists());
            slot.setYellowCards(s.getYellowCards());
            slot.setRedCards(s.getRedCards());

            lineup.getSlots().add(slot);
        }

        // --------------------------------------------
        // ✅ Player stats: update-in-place by playerId
        // IMPORTANT: payload.getPlayerStats() might be Set now
        // --------------------------------------------
        Map<Long, LineupPlayerStat> existingByPlayerId = new HashMap<>();
        for (LineupPlayerStat s : lineup.getPlayerStats()) {
            if (s.getPlayerId() != null) existingByPlayerId.put(s.getPlayerId(), s);
        }

        // ✅ Accept either Set or List from payload safely
        Collection<LineupPlayerStat> incoming = payload.getPlayerStats();

        // If frontend hasn't sent playerStats yet, derive from slots (legacy fallback)
        if (incoming == null || incoming.isEmpty()) {
            Map<Long, LineupPlayerStat> derived = new HashMap<>();
            for (LineupSlot s : payload.getSlots()) {
                if (s.getPlayerId() == null) continue;

                LineupPlayerStat stat = derived.computeIfAbsent(s.getPlayerId(), pid -> {
                    LineupPlayerStat x = new LineupPlayerStat();
                    x.setPlayerId(pid);
                    x.setGoals(0);
                    x.setAssists(0);
                    x.setYellowCards(0);
                    x.setRedCards(0);
                    return x;
                });

                stat.setGoals(n0(stat.getGoals()) + n0(s.getGoals()));
                stat.setAssists(n0(stat.getAssists()) + n0(s.getAssists()));
                stat.setYellowCards(n0(stat.getYellowCards()) + n0(s.getYellowCards()));
                stat.setRedCards(n0(stat.getRedCards()) + n0(s.getRedCards()));
            }
            incoming = derived.values(); // collection
        }

        // Track which playerIds we want to keep
        Set<Long> keep = new HashSet<>();

        for (LineupPlayerStat in : incoming) {
            if (in.getPlayerId() == null) {
                return ResponseEntity.badRequest().body("playerStats.playerId is required");
            }

            Long pid = in.getPlayerId();
            keep.add(pid);

            LineupPlayerStat target = existingByPlayerId.get(pid);
            if (target == null) {
                target = new LineupPlayerStat();
                target.setLineup(lineup);
                target.setPlayerId(pid);
                lineup.getPlayerStats().add(target);
                existingByPlayerId.put(pid, target);
            }

            target.setGoals(in.getGoals());
            target.setAssists(in.getAssists());
            target.setYellowCards(in.getYellowCards());
            target.setRedCards(in.getRedCards());
        }

        // Remove stats not in incoming
        lineup.getPlayerStats().removeIf(s -> s.getPlayerId() != null && !keep.contains(s.getPlayerId()));

        return ResponseEntity.ok(repo.save(lineup));
    }

    private int n0(Integer v) {
        return v == null ? 0 : Math.max(0, v);
    }

    // POST /api/lineups/summaries   { "ids": [1,2,3] }
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













