package com.candidatemgmt.dto;

import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.model.CandidateStatus;
import java.time.LocalDateTime;
import java.util.List;

public record CandidateResponse(
        Integer id,
        String firstName,
        String lastName,
        String email,
        String phone,
        List<String> skills,
        Integer experienceYears,
        String currentCompany,
        String currentLocation,
        CandidateStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static CandidateResponse from(Candidate c) {
        return new CandidateResponse(
                c.getId(),
                c.getFirstName(),
                c.getLastName(),
                c.getEmail(),
                c.getPhone(),
                c.getSkills(),
                c.getExperienceYears(),
                c.getCurrentCompany(),
                c.getCurrentLocation(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
