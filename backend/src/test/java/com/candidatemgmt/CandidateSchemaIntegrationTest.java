package com.candidatemgmt;

import static org.assertj.core.api.Assertions.assertThat;

import com.candidatemgmt.support.PostgresIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Guards the performance work: the indexes exist, and the query shapes that CandidateSpecifications
 * generates are ones PostgreSQL can answer from them. The tables are nearly empty, so sequential scans
 * are disabled to ask the planner "could you use an index here?" rather than "is it cheaper?".
 * If you change a filter in CandidateSpecifications, update the matching SQL below.
 */
class CandidateSchemaIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate transaction;

    @Test
    void trigramExtensionAndAllExpectedIndexesExist() {
        List<String> extensions = jdbc.queryForList("select extname from pg_extension", String.class);
        List<String> indexes = jdbc.queryForList("select indexname from pg_indexes where tablename = 'candidate'", String.class);

        assertThat(extensions).contains("pg_trgm");
        assertThat(indexes).contains(
                "candidate_pkey",
                "candidate_email_key",
                "candidate_first_name_trgm_idx",
                "candidate_last_name_trgm_idx",
                "candidate_email_trgm_idx",
                "candidate_location_trgm_idx",
                "candidate_skills_search_gin_idx",
                "candidate_status_experience_idx",
                "candidate_experience_idx");
    }

    @Test
    void emailHasAUniqueConstraint() {
        assertThat(jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'candidate_email_key'", String.class))
                .startsWith("CREATE UNIQUE INDEX");
    }

    @ParameterizedTest(name = "{0} can use {1}")
    @CsvSource(delimiter = '|', quoteCharacter = '"', value = {
            "name search (first name)|candidate_first_name_trgm_idx|select id from candidate where first_name ilike '%asha%' escape '\\'",
            "name search (last name)|candidate_last_name_trgm_idx|select id from candidate where last_name ilike '%rao%' escape '\\'",
            "email search|candidate_email_trgm_idx|select id from candidate where email ilike '%acme%' escape '\\'",
            "location filter|candidate_location_trgm_idx|select id from candidate where current_location ilike '%bengal%' escape '\\'",
            "skills filter|candidate_skills_search_gin_idx|select id from candidate where skills_search @> cast(array['java','spring'] as text[])",
            "status filter|candidate_status_experience_idx|select id from candidate where status = 'HIRED'",
            "experience range|candidate_experience_idx|select id from candidate where experience_years >= 5 and experience_years <= 10",
            "duplicate email lookup|candidate_email_key|select id from candidate where email = 'asha@example.com'",
    })
    void queryShapeIsIndexable(String filter, String expectedIndex, String sql) {
        String plan = transaction.execute(status -> {
            jdbc.execute("set local enable_seqscan = off");
            return String.join("\n", jdbc.queryForList("explain " + sql, String.class));
        });

        assertThat(plan).contains(expectedIndex);
    }

    @Test
    void statusCombinedWithAnExperienceRangeIsIndexable() {
        // Either index is valid here; which one wins depends on table statistics, so only require an index scan.
        String plan = transaction.execute(status -> {
            jdbc.execute("set local enable_seqscan = off");
            return String.join("\n", jdbc.queryForList(
                    "explain select id from candidate where status = 'HIRED' and experience_years >= 5 and experience_years <= 10",
                    String.class));
        });

        assertThat(plan).contains("Index Scan").doesNotContain("Seq Scan");
    }

    @Test
    void theOldCaseInsensitiveEmailLookupCouldNotUseTheUniqueIndex() {
        String plan = transaction.execute(status -> {
            jdbc.execute("set local enable_seqscan = off");
            return String.join("\n", jdbc.queryForList("explain select id from candidate where lower(email) = 'asha@example.com'", String.class));
        });

        // This is why email is now stored lowercase and compared directly.
        assertThat(plan).doesNotContain("candidate_email_key");
    }
}
