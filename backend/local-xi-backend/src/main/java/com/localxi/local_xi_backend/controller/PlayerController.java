package com.localxi.local_xi_backend.controller;

import com.localxi.local_xi_backend.model.Player;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final List<Player> players = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    @GetMapping
    public List<Player> getPlayers() {
        return players;
    }

    @PostMapping
    public Player createPlayer(@RequestBody Player player) {
        player.setId(idCounter.getAndIncrement());
        players.add(player);
        return player;
    }
}
