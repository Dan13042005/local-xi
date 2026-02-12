package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Formation;
import com.localxi.local_xi_backend.repository.FormationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/formations")
public class FormationController {

    private final FormationRepository repo;

    public FormationController(FormationRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Formation> getFormations() {
        return repo.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createFormation(@RequestBody Formation formation) {
        String validation = validateFormation(formation);
        if (!validation.isEmpty()) {
            return ResponseEntity.badRequest().body(validation);
        }

        Formation saved = repo.save(formation);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFormation(@PathVariable Long id, @RequestBody Formation patch) {
        return repo.findById(id)
                .map(existing -> {
                    if (patch.getName() != null) existing.setName(patch.getName());
                    if (patch.getShape() != null) existing.setShape(patch.getShape());
                    if (patch.getSlots() != null) existing.setSlots(patch.getSlots());

                    String validation = validateFormation(existing);
                    if (!validation.isEmpty()) {
                        return ResponseEntity.badRequest().body(validation);
                    }

                    return ResponseEntity.ok(repo.save(existing));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody IdsRequest request) {
        if (request.ids == null || request.ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No ids provided");
        }
        repo.deleteAllById(request.ids);
        return ResponseEntity.ok().build();
    }

    // ✅ centralised validation (slotId + position required)
    private String validateFormation(Formation formation) {
        if (formation.getName() == null || formation.getName().trim().isEmpty()) {
            return "Formation name is required";
        }
        if (formation.getShape() == null || formation.getShape().trim().isEmpty()) {
            return "Formation shape is required";
        }
        if (formation.getSlots() == null || formation.getSlots().isEmpty()) {
            return "Formation must include slots";
        }

        // slotId required + unique, position required
        Set<String> seen = new HashSet<>();
        for (var s : formation.getSlots()) {
            if (s.getSlotId() == null || s.getSlotId().trim().isEmpty()) {
                return "Each slot must include slotId";
            }
            if (s.getPosition() == null || s.getPosition().trim().isEmpty()) {
                return "Each slot must include position";
            }
            String key = s.getSlotId().trim();
            if (!seen.add(key)) {
                return "slotId must be unique within a formation";
            }
        }

        return "";
    }

    public static class IdsRequest {
        public List<Long> ids;
    }
}

