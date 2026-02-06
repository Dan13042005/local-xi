package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Formation;
import com.localxi.local_xi_backend.repository.FormationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        if (formation.getName() == null || formation.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Formation name is required");
        }
        if (formation.getShape() == null || formation.getShape().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Formation shape is required");
        }
        if (formation.getSlots() == null || formation.getSlots().isEmpty()) {
            return ResponseEntity.badRequest().body("Formation must include slots");
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

                    if (existing.getName() == null || existing.getName().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Formation name is required");
                    }
                    if (existing.getShape() == null || existing.getShape().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Formation shape is required");
                    }
                    if (existing.getSlots() == null || existing.getSlots().isEmpty()) {
                        return ResponseEntity.badRequest().body("Formation must include slots");
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

    public static class IdsRequest {
        public List<Long> ids;
    }
}
