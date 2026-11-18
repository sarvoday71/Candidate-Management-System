package com.candidatemgmt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.candidatemgmt.support.CandidatePayload;
import com.candidatemgmt.support.PostgresIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import java.util.stream.Stream;

/**
 * Seed data (last name | location | skills | years | status):
 * Rao | Bengaluru | Java, Spring | 5 | INTERVIEWING
 * Kumar | Mumbai | Python, Docker | 8 | HIRED
 * Iyer | bengaluru north | Java, Docker | 2 | NEW
 * Lee | (none) | JavaScript | 0 | NEW
 * 100%_Sure | New York | (none) | 10 | REJECTED
 */
class CandidateSearchIntegrationTest extends PostgresIntegrationTest {

    @BeforeEach
    void seed() throws Exception {
        create(CandidatePayload.of("Asha", "Rao", "asha.rao@acme.com").skills("Java", "Spring").experience(5)
                .location("Bengaluru").status("INTERVIEWING"));
        create(CandidatePayload.of("Ravi", "Kumar", "ravi.kumar@globex.io").skills("Python", "Docker").experience(8)
                .location("Mumbai").status("HIRED"));
        create(CandidatePayload.of("Meera", "Iyer", "meera@initech.com").skills("Java", "Docker").experience(2)
                .location("bengaluru north").status("NEW"));
        create(CandidatePayload.of("Tom", "Lee", "tom@hooli.com").skills("JavaScript").experience(0).status("NEW"));
        create(CandidatePayload.of("Pat", "100%_Sure", "pat@test.org").experience(10).location("New York").status("REJECTED"));
    }

    private List<String> lastNames(String query) throws Exception {
        String body = search(query + (query.isEmpty() ? "" : "&") + "size=100").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> names = JsonPath.read(body, "$.content[*].lastName");
        return names.stream().sorted().toList();
    }

    static Stream<Arguments> filters() {
        return Stream.of(
                // name: partial, case-insensitive, every word must match first or last name
                Arguments.of("name=asha", List.of("Rao")),
                Arguments.of("name=ASHA", List.of("Rao")),
                Arguments.of("name=RAO", List.of("Rao")),
                Arguments.of("name=kum", List.of("Kumar")),
                Arguments.of("name=asha%20rao", List.of("Rao")),
                Arguments.of("name=rao%20asha", List.of("Rao")),
                Arguments.of("name=asha%20kumar", List.of()),
                Arguments.of("name=zzz", List.of()),
                // LIKE wildcards in the search text are literal characters
                Arguments.of("name=%25", List.of("100%_Sure")),
                Arguments.of("name=_", List.of("100%_Sure")),
                Arguments.of("name=a_", List.of()),
                // email
                Arguments.of("email=globex", List.of("Kumar")),
                Arguments.of("email=GLOBEX", List.of("Kumar")),
                Arguments.of("email=.com", List.of("Iyer", "Lee", "Rao")),
                // location
                Arguments.of("location=bengal", List.of("Iyer", "Rao")),
                Arguments.of("location=NEW%20YORK", List.of("100%_Sure")),
                // skills: all must be present, whole-skill, case-insensitive
                Arguments.of("skills=java", List.of("Iyer", "Rao")),
                Arguments.of("skills=JAVA,spring", List.of("Rao")),
                Arguments.of("skills=java&skills=docker", List.of("Iyer")),
                Arguments.of("skills=docker,python&skills=docker", List.of("Kumar")),
                Arguments.of("skills=java,docker&skills=java", List.of("Iyer")),
                Arguments.of("skills=%20java%20,%20spring%20", List.of("Rao")),
                Arguments.of("skills=javascript", List.of("Lee")),
                Arguments.of("skills=script", List.of()),
                Arguments.of("skills=jav", List.of()),
                Arguments.of("skills=%25", List.of()),
                Arguments.of("skills=java,go", List.of()),
                // status
                Arguments.of("status=HIRED", List.of("Kumar")),
                Arguments.of("status=NEW", List.of("Iyer", "Lee")),
                Arguments.of("status=OFFERED", List.of()),
                // experience range is inclusive on both ends
                Arguments.of("minExperience=5", List.of("100%_Sure", "Kumar", "Rao")),
                Arguments.of("maxExperience=2", List.of("Iyer", "Lee")),
                Arguments.of("minExperience=2&maxExperience=5", List.of("Iyer", "Rao")),
                Arguments.of("minExperience=9&maxExperience=1", List.of()),
                // filters combine with AND
                Arguments.of("location=bengal&skills=java&maxExperience=5&status=NEW", List.of("Iyer")),
                Arguments.of("name=asha&minExperience=6", List.of()),
                Arguments.of("email=.com&status=NEW", List.of("Iyer", "Lee")),
                // blank values are ignored
                Arguments.of("name=&email=&location=&skills=", List.of("100%_Sure", "Iyer", "Kumar", "Lee", "Rao")));
    }

    @ParameterizedTest(name = "?{0} -> {1}")
    @MethodSource("filters")
    void filtersNarrowTheResults(String query, List<String> expectedLastNames) throws Exception {
        assertThat(lastNames(query)).containsExactlyElementsOf(expectedLastNames);
    }

    @Test
    void invalidFilterValuesAreBadRequests() throws Exception {
        search("status=hired").andExpect(status().isBadRequest());
        search("status=NOPE").andExpect(status().isBadRequest());
        search("minExperience=abc").andExpect(status().isBadRequest());
    }

    @Test
    void resultsAreNewestFirst() throws Exception {
        String body = search("size=100").andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$.content[*].id");

        assertThat(ids).hasSize(5).isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    @Test
    void totalsReflectTheFilterNotThePage() throws Exception {
        search("skills=java&size=1&page=0")
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void paginationSplitsTheResultsWithoutOverlap() throws Exception {
        for (int i = 0; i < 20; i++) {
            create(CandidatePayload.of("Bulk", "Person" + i, "bulk" + i + "@example.com"));
        }
        // 25 candidates in total, default page size 20
        search("")
                .andExpect(jsonPath("$.content.length()").value(20))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(2));
        search("page=1")
                .andExpect(jsonPath("$.content.length()").value(5))
                .andExpect(jsonPath("$.page").value(1));

        List<Integer> first = JsonPath.read(search("page=0&size=10").andReturn().getResponse().getContentAsString(), "$.content[*].id");
        List<Integer> second = JsonPath.read(search("page=1&size=10").andReturn().getResponse().getContentAsString(), "$.content[*].id");
        assertThat(first).doesNotContainAnyElementsOf(second);
        assertThat(first.get(first.size() - 1)).isGreaterThan(second.get(0));
    }

    @Test
    void aPageBeyondTheEndIsEmptyButKeepsTheTotals() throws Exception {
        search("page=5&size=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void pageSizeIsCappedAndBadPagingValuesAreClamped() throws Exception {
        search("size=100000").andExpect(jsonPath("$.size").value(100));
        search("size=0").andExpect(jsonPath("$.size").value(1));
        search("page=-3").andExpect(jsonPath("$.page").value(0));
    }
}
