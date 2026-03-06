package com.localxi.local_xi_backend.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    // tweak these if you want
    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_SECONDS = 5 * 60; // 5 minutes

    private static class Entry {
        int fails;
        Instant lockedUntil; // null if not locked
        Instant lastAttempt;
    }

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    // key = email|ip
    private String key(String email, String ip) {
        return (email == null ? "" : email.trim().toLowerCase()) + "|" + (ip == null ? "" : ip.trim());
    }

    public boolean isLocked(String email, String ip) {
        Entry e = store.get(key(email, ip));
        if (e == null || e.lockedUntil == null) return false;

        // expired lock -> clear
        if (Instant.now().isAfter(e.lockedUntil)) {
            e.lockedUntil = null;
            e.fails = 0;
            return false;
        }
        return true;
    }

    public long secondsUntilUnlock(String email, String ip) {
        Entry e = store.get(key(email, ip));
        if (e == null || e.lockedUntil == null) return 0;

        long s = e.lockedUntil.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, s);
    }

    public void recordFailure(String email, String ip) {
        String k = key(email, ip);
        Entry e = store.computeIfAbsent(k, _k -> new Entry());

        e.lastAttempt = Instant.now();

        // if lock expired, reset before counting
        if (e.lockedUntil != null && Instant.now().isAfter(e.lockedUntil)) {
            e.lockedUntil = null;
            e.fails = 0;
        }

        e.fails++;

        if (e.fails >= MAX_ATTEMPTS) {
            e.lockedUntil = Instant.now().plusSeconds(LOCK_SECONDS);
        }
    }

    public void recordSuccess(String email, String ip) {
        store.remove(key(email, ip));
    }

    // Optional: cleanup old entries (not required for your demo)
    // You could call this from a scheduled task if you want.
    public void pruneOlderThanSeconds(long seconds) {
        Instant cutoff = Instant.now().minusSeconds(seconds);
        store.entrySet().removeIf(en -> {
            Entry e = en.getValue();
            if (e == null || e.lastAttempt == null) return true;
            return e.lastAttempt.isBefore(cutoff);
        });
    }
}
