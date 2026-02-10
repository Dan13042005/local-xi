package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Lineup;
import com.localxi.local_xi_backend.model.LineupSlot;
import com.localxi.local_xi_backend.repository.LineupRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

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

    // Get lineup for a match (404 if none saved yet)
    @GetMapping("/match/{matchId}")
    public ResponseEntity<?> getForMatch(@PathVariable Long matchId) {
        Optional<Lineup> found = repo.findByMatchId(matchId);
        return found.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Create/update lineup for a match
    @PutMapping("/match/{matchId}")
    public ResponseEntity<?> upsertForMatch(@PathVariable Long matchId, @RequestBody Lineup payload) {

        if (payload.getFormationId() == null) {
            return ResponseEntity.badRequest().body("formationId is required");
        }
        if (payload.getSlots() == null) {
            return ResponseEntity.badRequest().body("Slots are required");
        }

        Lineup lineup = repo.findByMatchId(matchId).orElseGet(Lineup::new);

        lineup.setMatchId(matchId);
        lineup.setFormationId(payload.getFormationId());
        lineup.setCaptainPlayerId(payload.getCaptainPlayerId()); // nullable ok

        // Replace slots (simple + reliable)
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
            slot.setPlayerId(s.getPlayerId());     // nullable ok
            slot.setCaptain(s.isCaptain());
            slot.setRating(s.getRating());         // nullable ok

            lineup.getSlots().add(slot);
        }

        return ResponseEntity.ok(repo.save(lineup));
    }
}



