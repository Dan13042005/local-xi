package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
import com.localxi.local_xi_backend.model.LineupPlayerStat;
import com.localxi.local_xi_backend.model.Match;
import com.localxi.local_xi_backend.model.MatchEvent;
import com.localxi.local_xi_backend.repository.LineupRepository;
import com.localxi.local_xi_backend.repository.MatchEventRepository;
import com.localxi.local_xi_backend.repository.MatchRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/match-events")
public class MatchEventController {

    private final MatchEventRepository repo;
    private final MatchRepository matchRepo;
    private final LineupRepository lineupRepo;

    public MatchEventController(MatchEventRepository repo, MatchRepository matchRepo, LineupRepository lineupRepo) {
        this.repo = repo;
        this.matchRepo = matchRepo;
        this.lineupRepo = lineupRepo;
    }

    // GET /api/match-events/match/{matchId}
    @GetMapping("/match/{matchId}")
    public List<MatchEvent> getForMatch(@PathVariable Long matchId) {
        return repo.findByMatchIdOrderByMinuteAscIdAsc(matchId);
    }

    // PUT /api/match-events/match/{matchId}
    // Body: JSON array of MatchEvent-like objects (id optional/ignored)
    @PutMapping("/match/{matchId}")
    @Transactional
    public ResponseEntity<?> replaceForMatch(@PathVariable Long matchId, @RequestBody List<MatchEvent> incoming) {
        if (incoming == null) incoming = Collections.emptyList();

        for (MatchEvent e : incoming) {
            String msg = validateEvent(e);
            if (!msg.isEmpty()) return ResponseEntity.badRequest().body(msg);
        }

        repo.deleteByMatchId(matchId);

        List<MatchEvent> toSave = new ArrayList<>();
        for (MatchEvent e : incoming) {
            MatchEvent x = new MatchEvent();
            x.setMatchId(matchId);
            x.setMinute(e.getMinute());
            x.setType(e.getType());
            x.setPlayerId(e.getPlayerId());
            x.setRelatedPlayerId(e.getRelatedPlayerId());
            x.setNote(e.getNote());
            toSave.add(x);
        }

        return ResponseEntity.ok(repo.saveAll(toSave));
    }

    // ✅ NEW: POST /api/match-events/match/{matchId}/recompute
    // Recompute match score + lineup playerStats from stored events
    @PostMapping("/match/{matchId}/recompute")
    @Transactional
    public ResponseEntity<?> recomputeFromEvents(@PathVariable Long matchId) {

        // 1) Ensure match exists
        Match match = matchRepo.findById(matchId).orElse(null);
        if (match == null) {
            return ResponseEntity.status(404).body("Match not found: " + matchId);
        }

        // 2) Load events
        List<MatchEvent> events = repo.findByMatchIdOrderByMinuteAscIdAsc(matchId);

        // 3) Compute score (for now: every GOAL counts as Goals For)
        int gf = 0;
        for (MatchEvent e : events) {
            if (e.getType() == MatchEvent.EventType.GOAL) gf += 1;
        }

        match.setGoalsFor(gf);

        // If you haven't implemented "opponent goals" yet:
        // leave goalsAgainst as-is (don't clobber user input)
        // match.setGoalsAgainst(match.getGoalsAgainst());

        matchRepo.save(match);

        // 4) Compute per-player stats from events
        Map<Long, Agg> agg = new HashMap<>();

        for (MatchEvent e : events) {
            if (e.getType() == null) continue;

            switch (e.getType()) {
                case GOAL -> {
                    if (e.getPlayerId() != null) {
                        agg.computeIfAbsent(e.getPlayerId(), k -> new Agg()).goals += 1;
                    }
                    if (e.getRelatedPlayerId() != null) {
                        agg.computeIfAbsent(e.getRelatedPlayerId(), k -> new Agg()).assists += 1;
                    }
                }
                case YELLOW -> {
                    if (e.getPlayerId() != null) {
                        agg.computeIfAbsent(e.getPlayerId(), k -> new Agg()).yellow += 1;
                    }
                }
                case RED -> {
                    if (e.getPlayerId() != null) {
                        agg.computeIfAbsent(e.getPlayerId(), k -> new Agg()).red += 1;
                    }
                }
                case SUB -> {
                    // no numeric stats from subs (minutes can be derived later if you want)
                }
            }
        }

        // 5) Update lineup playerStats IF a lineup exists
        Lineup lineup = lineupRepo.findByMatchIdWithDetails(matchId).orElse(null);
        if (lineup != null) {

            // index existing by playerId (Set + equals/hashCode already helps, but keep it deterministic)
            Map<Long, LineupPlayerStat> existingByPlayerId = new HashMap<>();
            for (LineupPlayerStat s : lineup.getPlayerStats()) {
                if (s.getPlayerId() != null) existingByPlayerId.put(s.getPlayerId(), s);
            }

            Set<Long> keep = new HashSet<>();

            for (Map.Entry<Long, Agg> entry : agg.entrySet()) {
                Long pid = entry.getKey();
                Agg a = entry.getValue();

                keep.add(pid);

                LineupPlayerStat target = existingByPlayerId.get(pid);
                if (target == null) {
                    target = new LineupPlayerStat();
                    target.setLineup(lineup);
                    target.setPlayerId(pid);
                    lineup.getPlayerStats().add(target);
                    existingByPlayerId.put(pid, target);
                }

                target.setGoals(a.goals);
                target.setAssists(a.assists);
                target.setYellowCards(a.yellow);
                target.setRedCards(a.red);
            }

            // remove any stats rows no longer present in events aggregation
            lineup.getPlayerStats().removeIf(s -> s.getPlayerId() != null && !keep.contains(s.getPlayerId()));

            lineupRepo.save(lineup);
        }

        // Return a small payload so frontend can show success (and optionally refresh)
        Map<String, Object> out = new HashMap<>();
        out.put("matchId", matchId);
        out.put("goalsFor", match.getGoalsFor());
        out.put("goalsAgainst", match.getGoalsAgainst());
        out.put("lineupUpdated", lineup != null);

        return ResponseEntity.ok(out);
    }

    private static class Agg {
        int goals = 0;
        int assists = 0;
        int yellow = 0;
        int red = 0;
    }

    private String validateEvent(MatchEvent e) {
        if (e == null) return "Event cannot be null.";
        if (e.getType() == null) return "Event type is required.";
        if (e.getMinute() == null) return "Event minute is required.";
        if (e.getMinute() < 0 || e.getMinute() > 130) return "Event minute must be between 0 and 130.";

        switch (e.getType()) {
            case GOAL -> {
                if (e.getPlayerId() == null) return "GOAL requires playerId (scorer).";
            }
            case YELLOW, RED -> {
                if (e.getPlayerId() == null) return e.getType().name() + " requires playerId.";
            }
            case SUB -> {
                if (e.getPlayerId() == null) return "SUB requires playerId (sub ON).";
                if (e.getRelatedPlayerId() == null) return "SUB requires relatedPlayerId (sub OFF).";
                if (Objects.equals(e.getPlayerId(), e.getRelatedPlayerId()))
                    return "SUB on/off players must be different.";
            }
        }
        return "";
    }
}