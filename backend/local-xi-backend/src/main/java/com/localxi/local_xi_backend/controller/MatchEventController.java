package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.MatchEvent;
import com.localxi.local_xi_backend.repository.MatchEventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
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

    public MatchEventController(MatchEventRepository repo) {
        this.repo = repo;
    }

    // GET /api/match-events/match/{matchId}
    @GetMapping("/match/{matchId}")
    public ResponseEntity<?> getForMatch(@PathVariable Long matchId) {
        try {
            return ResponseEntity.ok(repo.findByMatchIdOrderByMinuteAscIdAsc(matchId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to load match events: " + e.getMessage());
        }
    }

    // PUT /api/match-events/match/{matchId}
    // Body: JSON array of MatchEvent-like objects (id optional/ignored)
    @PutMapping("/match/{matchId}")
    @Transactional
    public ResponseEntity<?> replaceForMatch(
            @PathVariable Long matchId,
            @RequestBody(required = false) List<MatchEvent> incoming
    ) {
        List<MatchEvent> safeIncoming = (incoming == null) ? Collections.emptyList() : incoming;

        // validate
        for (MatchEvent e : safeIncoming) {
            String msg = validateEvent(e);
            if (!msg.isEmpty()) return ResponseEntity.badRequest().body(msg);
        }

        // replace-all
        repo.deleteByMatchId(matchId);

        List<MatchEvent> toSave = new ArrayList<>();
        for (MatchEvent e : safeIncoming) {
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

    private String validateEvent(MatchEvent e) {
        if (e == null) return "Event cannot be null.";
        if (e.getType() == null) return "Event type is required.";
        if (e.getMinute() == null) return "Event minute is required.";
        if (e.getMinute() < 0 || e.getMinute() > 130) return "Event minute must be between 0 and 130.";

        switch (e.getType()) {
            case GOAL -> {
                if (e.getPlayerId() == null) return "GOAL requires playerId (scorer).";
                // relatedPlayerId = assist (optional)
            }
            case YELLOW, RED -> {
                if (e.getPlayerId() == null) return e.getType().name() + " requires playerId.";
            }
            case SUB -> {
                // playerId = ON, relatedPlayerId = OFF
                if (e.getPlayerId() == null) return "SUB requires playerId (sub ON).";
                if (e.getRelatedPlayerId() == null) return "SUB requires relatedPlayerId (sub OFF).";
                if (Objects.equals(e.getPlayerId(), e.getRelatedPlayerId())) {
                    return "SUB on/off players must be different.";
                }
            }
        }
        return "";
    }
}