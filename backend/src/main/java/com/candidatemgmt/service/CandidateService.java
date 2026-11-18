package com.candidatemgmt.service;

import com.candidatemgmt.dto.CandidateRequest;
import com.candidatemgmt.dto.CandidateResponse;
import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.dto.CandidateStats;
import com.candidatemgmt.dto.PageResponse;
import com.candidatemgmt.exception.CandidateNotFoundException;
import com.candidatemgmt.exception.DuplicateEmailException;
import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.model.CandidateStatus;
import com.candidatemgmt.repository.CandidateRepository;
import com.candidatemgmt.repository.CandidateSpecifications;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CandidateService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    private static final String STATS_CACHE = "candidateStats";
    private static final String EMAIL_UNIQUE_CONSTRAINT = "candidate_email_key";

    private final CandidateRepository repository;

    @CacheEvict(value = STATS_CACHE, allEntries = true)
    public CandidateResponse create(CandidateRequest request) {
        Candidate candidate = new Candidate();
        apply(candidate, request);
        return CandidateResponse.from(saveOrDuplicate(candidate, request.email()));
    }

    @Transactional(readOnly = true)
    public PageResponse<CandidateResponse> search(CandidateSearchCriteria criteria, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "id"));
        return PageResponse.from(
                repository.findAll(CandidateSpecifications.search(criteria), pageable).map(CandidateResponse::from));
    }

    @Transactional(readOnly = true)
    public CandidateResponse findById(Integer id) {
        return repository.findById(id).map(CandidateResponse::from)
                .orElseThrow(() -> new CandidateNotFoundException(id));
    }

    @CacheEvict(value = STATS_CACHE, allEntries = true)
    public CandidateResponse update(Integer id, CandidateRequest request) {
        Candidate candidate = repository.findById(id).orElseThrow(() -> new CandidateNotFoundException(id));
        apply(candidate, request);
        return CandidateResponse.from(saveOrDuplicate(candidate, request.email()));
    }

    @CacheEvict(value = STATS_CACHE, allEntries = true)
    public void delete(Integer id) {
        if (repository.deleteCandidateById(id) == 0) {
            throw new CandidateNotFoundException(id);
        }
    }

    /** Dashboard numbers from one aggregate query; cached briefly and evicted on every write. */
    @Cacheable(STATS_CACHE)
    @Transactional(readOnly = true)
    public CandidateStats stats() {
        Map<CandidateStatus, Long> byStatus = new EnumMap<>(CandidateStatus.class);
        for (CandidateStatus status : CandidateStatus.values()) {
            byStatus.put(status, 0L);
        }
        long total = 0;
        long experienceSum = 0;
        for (CandidateRepository.StatusStats row : repository.statsByStatus()) {
            byStatus.put(row.getStatus(), row.getTotal());
            total += row.getTotal();
            experienceSum += row.getExperienceSum();
        }
        double average = total == 0 ? 0 : Math.round(experienceSum * 10.0 / total) / 10.0;
        return new CandidateStats(total, average, byStatus);
    }

    // The unique index is the source of truth for duplicate emails. Relying on it (instead of a
    // check-then-insert) saves a round trip per write and closes the race between concurrent requests.
    private Candidate saveOrDuplicate(Candidate candidate, String email) {
        try {
            return repository.saveAndFlush(candidate);
        } catch (DataIntegrityViolationException ex) {
            String detail = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (detail.contains(EMAIL_UNIQUE_CONSTRAINT)) {
                throw new DuplicateEmailException(email);
            }
            throw ex;
        }
    }

    private void apply(Candidate candidate, CandidateRequest request) {
        candidate.setFirstName(request.firstName().trim());
        candidate.setLastName(request.lastName().trim());
        candidate.setEmail(request.email());
        candidate.setPhone(request.phone());
        candidate.setSkills(cleanSkills(request.skills()));
        candidate.setExperienceYears(request.experienceYears() != null ? request.experienceYears() : 0);
        candidate.setCurrentCompany(request.currentCompany());
        candidate.setCurrentLocation(request.currentLocation());
        candidate.setStatus(request.status() != null ? request.status() : CandidateStatus.NEW);
    }

    private List<String> cleanSkills(List<String> skills) {
        List<String> cleaned = new ArrayList<>();
        if (skills == null) {
            return cleaned;
        }
        Set<String> seen = new HashSet<>();
        for (String skill : skills) {
            if (skill != null && !skill.isBlank() && seen.add(skill.trim().toLowerCase(Locale.ROOT))) {
                cleaned.add(skill.trim());
            }
        }
        return cleaned;
    }
}
