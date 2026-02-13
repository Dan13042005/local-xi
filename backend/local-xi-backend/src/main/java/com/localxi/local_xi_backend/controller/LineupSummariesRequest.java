package com.localxi.local_xi_backend.controller;

import java.util.List;

public class LineupSummariesRequest {
    private List<Long> matchIds;

    public LineupSummariesRequest() {}

    public List<Long> getMatchIds() {
        return matchIds;
    }

    public void setMatchIds(List<Long> matchIds) {
        this.matchIds = matchIds;
    }
}

