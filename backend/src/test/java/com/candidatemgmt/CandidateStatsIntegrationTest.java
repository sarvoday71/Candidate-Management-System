package com.candidatemgmt;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.support.CandidatePayload;
import com.candidatemgmt.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;

class CandidateStatsIntegrationTest extends PostgresIntegrationTest {

    private static final String STATS = API + "/stats";

    @Test
    void emptyDatabaseReportsZeroForEveryStatus() throws Exception {
        mvc.perform(get(STATS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.averageExperience").value(0.0))
                .andExpect(jsonPath("$.byStatus.NEW").value(0))
                .andExpect(jsonPath("$.byStatus.SCREENING").value(0))
                .andExpect(jsonPath("$.byStatus.INTERVIEWING").value(0))
                .andExpect(jsonPath("$.byStatus.OFFERED").value(0))
                .andExpect(jsonPath("$.byStatus.HIRED").value(0))
                .andExpect(jsonPath("$.byStatus.REJECTED").value(0));
    }

    @Test
    void countsPerStatusAndAverageExperience() throws Exception {
        create(CandidatePayload.of("A", "One", "a@example.com").experience(5).status("INTERVIEWING"));
        create(CandidatePayload.of("B", "Two", "b@example.com").experience(8).status("HIRED"));
        create(CandidatePayload.of("C", "Three", "c@example.com").experience(2).status("NEW"));
        create(CandidatePayload.of("D", "Four", "d@example.com").experience(0).status("NEW"));
        create(CandidatePayload.of("E", "Five", "e@example.com").experience(10).status("REJECTED"));

        mvc.perform(get(STATS))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.averageExperience").value(5.0))
                .andExpect(jsonPath("$.byStatus.NEW").value(2))
                .andExpect(jsonPath("$.byStatus.INTERVIEWING").value(1))
                .andExpect(jsonPath("$.byStatus.HIRED").value(1))
                .andExpect(jsonPath("$.byStatus.REJECTED").value(1))
                .andExpect(jsonPath("$.byStatus.SCREENING").value(0))
                .andExpect(jsonPath("$.byStatus.OFFERED").value(0));
    }

    @Test
    void averageIsRoundedToOneDecimal() throws Exception {
        create(CandidatePayload.of("A", "One", "a@example.com").experience(1));
        create(CandidatePayload.of("B", "Two", "b@example.com").experience(1));
        create(CandidatePayload.of("C", "Three", "c@example.com").experience(2));

        mvc.perform(get(STATS)).andExpect(jsonPath("$.averageExperience").value(1.3)); // 4 / 3
    }

    @Test
    void statsAreServedFromTheCacheUntilSomethingIsWritten() throws Exception {
        create(CandidatePayload.of("A", "One", "a@example.com"));
        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));

        // Bypasses the service on purpose, so nothing evicts the cache: proves the second read is a cache hit.
        Candidate sneaky = new Candidate();
        sneaky.setFirstName("Sneaky");
        sneaky.setLastName("Insert");
        sneaky.setEmail("sneaky@example.com");
        repository.save(sneaky);

        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void creatingEvictsTheCache() throws Exception {
        create(CandidatePayload.of("A", "One", "a@example.com").status("NEW"));
        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));

        create(CandidatePayload.of("B", "Two", "b@example.com").status("OFFERED"));

        mvc.perform(get(STATS))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.byStatus.OFFERED").value(1));
    }

    @Test
    void updatingEvictsTheCache() throws Exception {
        int id = create(CandidatePayload.of("A", "One", "a@example.com").status("NEW"));
        mvc.perform(get(STATS)).andExpect(jsonPath("$.byStatus.NEW").value(1));

        put(id, CandidatePayload.of("A", "One", "a@example.com").status("HIRED")).andExpect(status().isOk());

        mvc.perform(get(STATS))
                .andExpect(jsonPath("$.byStatus.NEW").value(0))
                .andExpect(jsonPath("$.byStatus.HIRED").value(1));
    }

    @Test
    void deletingEvictsTheCache() throws Exception {
        int id = create(CandidatePayload.of("A", "One", "a@example.com"));
        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));

        mvc.perform(delete(API + "/" + id)).andExpect(status().isNoContent());

        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void aFailedWriteDoesNotEvictOrChangeTheStats() throws Exception {
        create(CandidatePayload.of("A", "One", "a@example.com"));
        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));

        post(CandidatePayload.of("Dup", "Licate", "a@example.com")).andExpect(status().isConflict());

        mvc.perform(get(STATS)).andExpect(jsonPath("$.total").value(1));
    }
}
