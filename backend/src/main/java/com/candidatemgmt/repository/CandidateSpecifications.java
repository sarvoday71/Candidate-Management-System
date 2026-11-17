package com.candidatemgmt.repository;

import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.model.Candidate;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class CandidateSpecifications {

    private static final char ESCAPE = '\\';

    private CandidateSpecifications() {
    }

    /**
     * Combines every non-blank criterion with AND.
     * <ul>
     *   <li>name: every word must appear in the first or last name (partial, case-insensitive)</li>
     *   <li>email, location: partial, case-insensitive</li>
     *   <li>skills: the candidate must have ALL listed skills (exact skill, case-insensitive)</li>
     *   <li>minExperience / maxExperience: inclusive bounds on experience_years</li>
     *   <li>status: exact match</li>
     * </ul>
     */
    public static Specification<Candidate> search(CandidateSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(criteria.name())) {
                for (String word : criteria.name().trim().split("\\s+")) {
                    String pattern = "%" + escape(word) + "%";
                    predicates.add(cb.or(
                            cb.like(cb.lower(root.get("firstName")), pattern, ESCAPE),
                            cb.like(cb.lower(root.get("lastName")), pattern, ESCAPE)));
                }
            }

            if (hasText(criteria.email())) {
                predicates.add(cb.like(cb.lower(root.get("email")),
                        "%" + escape(criteria.email().trim()) + "%", ESCAPE));
            }

            if (hasText(criteria.location())) {
                predicates.add(cb.like(cb.lower(root.get("currentLocation")),
                        "%" + escape(criteria.location().trim()) + "%", ESCAPE));
            }

            if (criteria.skills() != null) {
                // ",java,spring," LIKE '%,java,%' matches whole skills only, so "java" never matches "javascript"
                Expression<String> joined = cb.concat(
                        cb.concat(",", cb.lower(cb.function("array_to_string", String.class,
                                root.get("skills"), cb.literal(",")))),
                        ",");
                for (String skill : criteria.skills()) {
                    if (hasText(skill)) {
                        predicates.add(cb.like(joined, "%," + escape(skill.trim()) + ",%", ESCAPE));
                    }
                }
            }

            if (criteria.minExperience() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<Integer>get("experienceYears"), criteria.minExperience()));
            }

            if (criteria.maxExperience() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<Integer>get("experienceYears"), criteria.maxExperience()));
            }

            if (criteria.status() != null) {
                predicates.add(cb.equal(root.get("status"), criteria.status()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String escape(String value) {
        return value.toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
