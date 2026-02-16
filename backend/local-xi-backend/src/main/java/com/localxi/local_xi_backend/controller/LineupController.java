package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
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

        // replace slots
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

            lineup.getSlots().add(slot);
        }

        return ResponseEntity.ok(repo.save(lineup));
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






