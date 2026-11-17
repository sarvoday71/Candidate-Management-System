package com.candidatemgmt.dto;

import com.candidatemgmt.model.CandidateStatus;
import java.util.List;

public record CandidateSearchCriteria(
        String name,
        String email,
        String location,
        List<String> skills,
        Integer minExperience,
        Integer maxExperience,
        CandidateStatus status) {
}
