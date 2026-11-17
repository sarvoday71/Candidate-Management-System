package com.candidatemgmt.repository;

import com.candidatemgmt.model.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CandidateRepository
        extends JpaRepository<Candidate, Integer>, JpaSpecificationExecutor<Candidate> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Integer id);
}
