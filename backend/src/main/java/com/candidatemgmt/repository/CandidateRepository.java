package com.candidatemgmt.repository;

import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.model.CandidateStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CandidateRepository
        extends JpaRepository<Candidate, Integer>, JpaSpecificationExecutor<Candidate> {

    interface StatusStats {
        CandidateStatus getStatus();

        long getTotal();

        long getExperienceSum();
    }

    /** One aggregate query; served by an index-only scan on (status, experience_years). */
    @Query("select c.status as status, count(c) as total, coalesce(sum(c.experienceYears), 0) as experienceSum "
            + "from Candidate c group by c.status")
    List<StatusStats> statsByStatus();

    /** Single DELETE round trip (no load-then-delete); returns the number of rows removed. */
    @Modifying
    @Query("delete from Candidate c where c.id = :id")
    int deleteCandidateById(@Param("id") Integer id);
}
