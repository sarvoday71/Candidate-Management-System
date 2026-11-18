package com.candidatemgmt.repository;

import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.model.Candidate;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.jpa.domain.Specification;

/**
 * Every filter is written so PostgreSQL can answer it from an index (see prisma/schema.prisma):
 * text filters use ILIKE on the raw column (trigram GIN indexes), skills use array containment
 * (GIN on skills_search), experience and status use btree indexes.
 */
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
            HibernateCriteriaBuilder hcb = (HibernateCriteriaBuilder) cb;
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(criteria.name())) {
                for (String word : criteria.name().trim().split("\\s+")) {
                    String pattern = contains(word);
                    predicates.add(cb.or(
                            hcb.ilike(root.get("firstName"), pattern, ESCAPE),
                            hcb.ilike(root.get("lastName"), pattern, ESCAPE)));
                }
            }

            if (hasText(criteria.email())) {
                predicates.add(hcb.ilike(root.get("email"), contains(criteria.email().trim()), ESCAPE));
            }

            if (hasText(criteria.location())) {
                predicates.add(hcb.ilike(root.get("currentLocation"), contains(criteria.location().trim()), ESCAPE));
            }

            if (criteria.skills() != null) {
                String[] wanted = criteria.skills().stream()
                        .filter(CandidateSpecifications::hasText)
                        .map(s -> s.trim().toLowerCase(Locale.ROOT))
                        .distinct()
                        .toArray(String[]::new);
                if (wanted.length > 0) {
                    // One bound array parameter, cast to text[] to match the column; `@>` is served by the GIN index.
                    predicates.add(cb.isTrue(hcb.sql("? @> cast(? as text[])", Boolean.class,
                            root.get("skillsSearch"), hcb.value(wanted))));
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

    private static String contains(String value) {
        String escaped = value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
