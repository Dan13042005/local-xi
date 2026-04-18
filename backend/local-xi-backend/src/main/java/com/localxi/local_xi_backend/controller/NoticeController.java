package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Notice;
import com.localxi.local_xi_backend.repository.AppUserRepository;
import com.localxi.local_xi_backend.repository.NoticeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
)
@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeRepository notices;
    private final AppUserRepository users;

    public NoticeController(NoticeRepository notices, AppUserRepository users) {
        this.notices = notices;
        this.users = users;
    }

    @GetMapping
    public ResponseEntity<?> listForMyTeam() {
        Long userId = getUserId();

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Long teamId = userOpt.get().getTeam().getId();
        List<Notice> out = notices.findByTeam_IdOrderByCreatedAtDesc(teamId);
        return ResponseEntity.ok(out);
    }

    public static class CreateNoticeRequest {
        public String title;
        public String body;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateNoticeRequest req) {
        Long userId = getUserId();

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        var user = userOpt.get();

        if (req == null || req.title == null || req.title.isBlank() || req.body == null || req.body.isBlank()) {
            return ResponseEntity.badRequest().body("title and body are required");
        }

        Notice n = new Notice();
        n.setTeam(user.getTeam());
        n.setCreatedBy(user);
        n.setTitle(req.title.trim());
        n.setBody(req.body.trim());

        return ResponseEntity.ok(notices.save(n));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Long userId = getUserId();

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        var noticeOpt = notices.findById(id);
        if (noticeOpt.isEmpty()) return ResponseEntity.notFound().build();

        var notice = noticeOpt.get();
        Long userTeamId = userOpt.get().getTeam().getId();
        Long noticeTeamId = notice.getTeam().getId();

        if (!userTeamId.equals(noticeTeamId)) {
            return ResponseEntity.status(403).body("You cannot delete a notice for another team.");
        }

        notices.delete(notice);
        return ResponseEntity.ok().build();
    }

    private Long getUserId() {
        String principal = (String) SecurityContextHolder
            .getContext().getAuthentication().getPrincipal();
        return Long.valueOf(principal.split(":")[0]);
    }
}