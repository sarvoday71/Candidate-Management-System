package com.candidatemgmt.dto;

import com.candidatemgmt.model.CandidateStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CandidateRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Email String email,
        String phone,
        List<String> skills,
        @Min(0) Integer experienceYears,
        String currentCompany,
        String currentLocation,
        CandidateStatus status) {
}
