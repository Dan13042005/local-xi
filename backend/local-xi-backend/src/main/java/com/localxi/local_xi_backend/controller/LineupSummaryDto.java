package com.localxi.local_xi_backend.controller;

public class LineupSummaryDto {
    private Long matchId;
    private Long formationId;

    public LineupSummaryDto() {}

    public LineupSummaryDto(Long matchId, Long formationId) {
        this.matchId = matchId;
        this.formationId = formationId;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public Long getFormationId() {
        return formationId;
    }

    public void setFormationId(Long formationId) {
        this.formationId = formationId;
    }
}
