package com.candidatemgmt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasKey;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.candidatemgmt.model.Candidate;
import com.candidatemgmt.support.CandidatePayload;
import com.candidatemgmt.support.PostgresIntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

class CandidateCrudIntegrationTest extends PostgresIntegrationTest {

    private static CandidatePayload asha() {
        return CandidatePayload.of("Asha", "Rao", "asha.rao@acme.com");
    }

    @Test
    void createPersistsTheCandidateAndReturnsIt() throws Exception {
        post(asha().phone("+91 98765 43210").skills("Java", "Spring").experience(3)
                .company("Acme Corp").location("Bengaluru").status("INTERVIEWING"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString(API + "/")))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.firstName").value("Asha"))
                .andExpect(jsonPath("$.phone").value("+91 98765 43210"))
                .andExpect(jsonPath("$.skills[0]").value("Java"))
                .andExpect(jsonPath("$.experienceYears").value(3))
                .andExpect(jsonPath("$.currentCompany").value("Acme Corp"))
                .andExpect(jsonPath("$.currentLocation").value("Bengaluru"))
                .andExpect(jsonPath("$.status").value("INTERVIEWING"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void createAppliesDefaults() throws Exception {
        post(asha())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.experienceYears").value(0))
                .andExpect(jsonPath("$.skills").isEmpty());
    }

    @Test
    void emailIsStoredLowercase() throws Exception {
        int id = create(CandidatePayload.of("Asha", "Rao", "Mixed.Case@Example.COM"));

        assertThat(repository.findById(id).orElseThrow().getEmail()).isEqualTo("mixed.case@example.com");
    }

    @Test
    void emailWithSurroundingSpacesIsRejectedRatherThanSilentlyTrimmed() throws Exception {
        post(CandidatePayload.of("Asha", "Rao", " asha@example.com "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasKey("email")));
    }

    @Test
    void skillsAreCleanedAndALowercaseSearchCopyIsKept() throws Exception {
        int id = create(asha().skills("Java", " java ", "JAVA", "Spring", "", "C++"));

        Candidate saved = repository.findById(id).orElseThrow();
        assertThat(saved.getSkills()).containsExactly("Java", "Spring", "C++");
        assertThat(saved.getSkillsSearch()).containsExactly("java", "spring", "c++");
    }

    @Test
    void duplicateEmailIsRejectedEvenWithDifferentCasing() throws Exception {
        create(asha());

        post(CandidatePayload.of("Someone", "Else", "ASHA.RAO@ACME.COM"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void concurrentCreatesWithTheSameEmailYieldExactlyOneWinnerAndNoServerErrors() throws Exception {
        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                Callable<Integer> request = () -> {
                    ready.countDown();
                    go.await();
                    return post(CandidatePayload.of("Race", "Condition", "race@example.com")).andReturn().getResponse().getStatus();
                };
                futures.add(pool.submit(request));
            }
            ready.await();
            go.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }

            assertThat(statuses).containsOnly(201, 409);
            assertThat(statuses.stream().filter(s -> s == 201).count()).isEqualTo(1);
            assertThat(statuses.stream().filter(s -> s == 409).count()).isEqualTo(threads - 1);
            assertThat(repository.count()).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void createValidatesRequiredFieldsAndFormats() throws Exception {
        post(CandidatePayload.of("", "  ", "not-an-email").experience(-1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasKey("firstName")))
                .andExpect(jsonPath("$.errors", hasKey("lastName")))
                .andExpect(jsonPath("$.errors", hasKey("email")))
                .andExpect(jsonPath("$.errors", hasKey("experienceYears")));

        assertThat(repository.count()).isZero();
    }

    @Test
    void createRejectsAnUnknownStatus() throws Exception {
        post(asha().status("MAYBE")).andExpect(status().isBadRequest());

        assertThat(repository.count()).isZero();
    }

    @Test
    void getByIdReturnsTheStoredCandidate() throws Exception {
        int id = create(asha().skills("Java").location("Pune"));

        mvc.perform(get(API + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.email").value("asha.rao@acme.com"))
                .andExpect(jsonPath("$.currentLocation").value("Pune"));
    }

    @Test
    void getByIdOfUnknownCandidateIs404() throws Exception {
        mvc.perform(get(API + "/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Candidate not found with id 999999"));
    }

    @Test
    void updateReplacesTheFieldsAndRefreshesTheSearchCopyOfSkills() throws Exception {
        int id = create(asha().skills("Java", "Spring").experience(3).status("NEW"));

        put(id, CandidatePayload.of("Asha", "Menon", "asha.menon@globex.io").skills("Go", "Rust")
                .experience(7).location("Mumbai").status("OFFERED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.lastName").value("Menon"))
                .andExpect(jsonPath("$.email").value("asha.menon@globex.io"))
                .andExpect(jsonPath("$.status").value("OFFERED"));

        Candidate saved = repository.findById(id).orElseThrow();
        assertThat(saved.getSkills()).containsExactly("Go", "Rust");
        assertThat(saved.getSkillsSearch()).containsExactly("go", "rust");
        assertThat(saved.getExperienceYears()).isEqualTo(7);
        assertThat(saved.getCurrentLocation()).isEqualTo("Mumbai");
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void updateAdvancesUpdatedAtAndKeepsCreatedAt() throws Exception {
        int id = create(asha());
        Candidate before = repository.findById(id).orElseThrow();

        Thread.sleep(20);
        put(id, asha().experience(5)).andExpect(status().isOk());

        Candidate after = repository.findById(id).orElseThrow();
        assertThat(after.getCreatedAt()).isEqualTo(before.getCreatedAt());
        assertThat(after.getUpdatedAt()).isAfter(before.getUpdatedAt());
    }

    @Test
    void updatingACandidateWithItsOwnEmailIsNotAConflict() throws Exception {
        int id = create(asha());

        put(id, asha().experience(9)).andExpect(status().isOk()).andExpect(jsonPath("$.experienceYears").value(9));
    }

    @Test
    void updatingToAnotherCandidatesEmailIsAConflictAndChangesNothing() throws Exception {
        create(asha());
        int otherId = create(CandidatePayload.of("Ravi", "Kumar", "ravi@acme.com").experience(2));

        put(otherId, CandidatePayload.of("Ravi", "Kumar", "ASHA.RAO@acme.com").experience(8))
                .andExpect(status().isConflict());

        Candidate untouched = repository.findById(otherId).orElseThrow();
        assertThat(untouched.getEmail()).isEqualTo("ravi@acme.com");
        assertThat(untouched.getExperienceYears()).isEqualTo(2);
    }

    @Test
    void updateOfUnknownCandidateIs404() throws Exception {
        put(999999, asha()).andExpect(status().isNotFound());
    }

    @Test
    void updateValidatesTheBody() throws Exception {
        int id = create(asha());

        put(id, CandidatePayload.of("", "Rao", "asha.rao@acme.com")).andExpect(status().isBadRequest());
    }

    @Test
    void deleteRemovesTheCandidate() throws Exception {
        int id = create(asha());

        mvc.perform(delete(API + "/" + id)).andExpect(status().isNoContent());

        assertThat(repository.existsById(id)).isFalse();
        mvc.perform(get(API + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void deleteOfUnknownCandidateIs404() throws Exception {
        mvc.perform(delete(API + "/999999")).andExpect(status().isNotFound());
    }

    @Test
    void deletingTwiceReturns404TheSecondTime() throws Exception {
        int id = create(asha());

        mvc.perform(delete(API + "/" + id)).andExpect(status().isNoContent());
        mvc.perform(delete(API + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void aFreedEmailCanBeUsedAgainAfterDeletion() throws Exception {
        int id = create(asha());
        mvc.perform(delete(API + "/" + id)).andExpect(status().isNoContent());

        post(asha()).andExpect(status().isCreated());
    }
}
