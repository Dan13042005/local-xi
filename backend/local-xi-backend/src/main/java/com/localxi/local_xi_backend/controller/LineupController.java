package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
import com.localxi.local_xi_backend.model.LineupSlot;
import com.localxi.local_xi_backend.repository.LineupRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;


@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS}
)
@RestController
@RequestMapping("/api/lineups")
public class LineupController {

    private final LineupRepository repo;

    public LineupController(LineupRepository repo) {
        this.repo = repo;
    }

    // Get lineup for a match (returns 404 if none saved yet)
    @GetMapping("/match/{matchId}")
    public ResponseEntity<?> getForMatch(@PathVariable Long matchId) {
        return repo.findByMatchId(matchId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Create/update lineup for a match
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
            slot.setPlayerId(s.getPlayerId());   // nullable ok
            slot.setCaptain(s.isCaptain());
            slot.setRating(s.getRating());       // nullable ok

            lineup.getSlots().add(slot);
        }

        return ResponseEntity.ok(repo.save(lineup));
    }

    // ✅ NEW: lineup summaries for a list of match IDs
    // POST /api/lineups/summaries  body: { "ids": [1,2,3] }
    @PostMapping("/summaries")
    public ResponseEntity<?> getSummaries(@RequestBody IdsRequest request) {
        if (request == null || request.ids == null || request.ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No ids provided");
        }

        List<Long> ids = request.ids;

        List<Lineup> lineups = repo.findByMatchIdIn(ids);

        List<LineupSummary> summaries = lineups.stream()
                .map(l -> new LineupSummary(l.getMatchId(), l.getFormationId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
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
    // ✅ NEW: summaries for matches (used by Matches table)
@PostMapping("/summaries")
public ResponseEntity<?> getLineupSummaries(@RequestBody LineupSummariesRequest req) {
    if (req == null || req.getMatchIds() == null) {
        return ResponseEntity.badRequest().body("matchIds is required");
    }

    List<Long> ids = req.getMatchIds()
            .stream()
            .filter(x -> x != null)
            .distinct()
            .collect(Collectors.toList());

    if (ids.isEmpty()) {
        return ResponseEntity.ok(List.of());
    }

    var lineups = repo.findByMatchIdIn(ids);

    var result = lineups.stream()
            .map(l -> new LineupSummaryDto(l.getMatchId(), l.getFormationId()))
            .collect(Collectors.toList());

    return ResponseEntity.ok(result);
}


}





