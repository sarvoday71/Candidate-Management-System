package com.candidatemgmt.dto;

import com.candidatemgmt.model.CandidateStatus;
import java.util.Map;

public record CandidateStats(
        long total,
        double averageExperience,
        Map<CandidateStatus, Long> byStatus) {
}
