package com.candidatemgmt.dto;

import com.candidatemgmt.model.CandidateStatus;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public record CandidateSearchCriteria(
        String name,
        String email,
        String location,
        List<String> skills,
        Integer minExperience,
        Integer maxExperience,
        CandidateStatus status) {

    public CandidateSearchCriteria {
        if (skills != null) {
            // Spring splits "a,b" into two values only when the parameter appears once. Splitting here as well
            // makes "skills=a,b&skills=c" behave the same as "skills=a&skills=b&skills=c".
            skills = skills.stream()
                    .filter(Objects::nonNull)
                    .flatMap(s -> Arrays.stream(s.split(",")))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }
}
