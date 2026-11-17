package com.candidatemgmt.service;

import com.candidatemgmt.dto.CandidateRequest;
import com.candidatemgmt.dto.CandidateResponse;
import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.exception.CandidateNotFoundException;
import com.candidatemgmt.exception.DuplicateEmailException;
import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.model.CandidateStatus;
import com.candidatemgmt.repository.CandidateRepository;
import com.candidatemgmt.repository.CandidateSpecifications;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CandidateService {

    private final CandidateRepository repository;

    public CandidateResponse create(CandidateRequest request) {
        if (repository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateEmailException(request.email());
        }
        Candidate candidate = new Candidate();
        apply(candidate, request);
        return CandidateResponse.from(repository.save(candidate));
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> search(CandidateSearchCriteria criteria) {
        return repository.findAll(CandidateSpecifications.search(criteria), Sort.by("id"))
                .stream().map(CandidateResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CandidateResponse findById(Integer id) {
        return CandidateResponse.from(getOrThrow(id));
    }

    public CandidateResponse update(Integer id, CandidateRequest request) {
        Candidate candidate = getOrThrow(id);
        if (repository.existsByEmailIgnoreCaseAndIdNot(request.email(), id)) {
            throw new DuplicateEmailException(request.email());
        }
        apply(candidate, request);
        return CandidateResponse.from(repository.save(candidate));
    }

    public void delete(Integer id) {
        repository.delete(getOrThrow(id));
    }

    private Candidate getOrThrow(Integer id) {
        return repository.findById(id).orElseThrow(() -> new CandidateNotFoundException(id));
    }

    private void apply(Candidate candidate, CandidateRequest request) {
        candidate.setFirstName(request.firstName());
        candidate.setLastName(request.lastName());
        candidate.setEmail(request.email());
        candidate.setPhone(request.phone());
        candidate.setSkills(request.skills() != null ? new ArrayList<>(request.skills()) : new ArrayList<>());
        candidate.setExperienceYears(request.experienceYears() != null ? request.experienceYears() : 0);
        candidate.setCurrentCompany(request.currentCompany());
        candidate.setCurrentLocation(request.currentLocation());
        candidate.setStatus(request.status() != null ? request.status() : CandidateStatus.NEW);
    }
}
