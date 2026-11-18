package com.candidatemgmt.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasKey;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.candidatemgmt.dto.CandidateRequest;
import com.candidatemgmt.dto.CandidateResponse;
import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.dto.CandidateStats;
import com.candidatemgmt.dto.PageResponse;
import com.candidatemgmt.exception.CandidateNotFoundException;
import com.candidatemgmt.exception.DuplicateEmailException;
import com.candidatemgmt.model.CandidateStatus;
import com.candidatemgmt.service.CandidateService;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** HTTP contract only: routing, parameter binding, validation and error mapping. The service is mocked. */
@WebMvcTest(CandidateController.class)
class CandidateControllerTest {

    private static final String VALID_BODY = """
            {"firstName":"Asha","lastName":"Rao","email":"asha@example.com","skills":["Java"],"experienceYears":3}
            """;

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CandidateService service;

    private static CandidateResponse response(int id) {
        return new CandidateResponse(id, "Asha", "Rao", "asha@example.com", null, List.of("Java"), 3, "Acme", "Bengaluru",
                CandidateStatus.NEW, LocalDateTime.parse("2026-11-14T11:39:45"), LocalDateTime.parse("2026-11-14T11:39:45"));
    }

    private static PageResponse<CandidateResponse> emptyPage() {
        return new PageResponse<>(List.of(), 0, 20, 0, 0);
    }

    @Test
    void createReturns201WithLocationHeaderAndBody() throws Exception {
        when(service.create(any(CandidateRequest.class))).thenReturn(response(42));

        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/api/candidates/42")))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.firstName").value("Asha"))
                .andExpect(jsonPath("$.skills[0]").value("Java"));
    }

    @Test
    void createPassesTheParsedBodyToTheService() throws Exception {
        when(service.create(any(CandidateRequest.class))).thenReturn(response(1));

        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON).content("""
                {"firstName":"Asha","lastName":"Rao","email":"asha@example.com","phone":"123","skills":["Java","Spring"],
                 "experienceYears":3,"currentCompany":"Acme","currentLocation":"Pune","status":"HIRED"}
                """)).andExpect(status().isCreated());

        ArgumentCaptor<CandidateRequest> captor = ArgumentCaptor.forClass(CandidateRequest.class);
        verify(service).create(captor.capture());
        CandidateRequest sent = captor.getValue();
        assertThat(sent.skills()).containsExactly("Java", "Spring");
        assertThat(sent.experienceYears()).isEqualTo(3);
        assertThat(sent.status()).isEqualTo(CandidateStatus.HIRED);
        assertThat(sent.currentLocation()).isEqualTo("Pune");
    }

    @Test
    void createRejectsInvalidFieldsAndListsEachOne() throws Exception {
        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"\",\"lastName\":\"  \",\"email\":\"not-an-email\",\"experienceYears\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors", hasKey("firstName")))
                .andExpect(jsonPath("$.errors", hasKey("lastName")))
                .andExpect(jsonPath("$.errors", hasKey("email")))
                .andExpect(jsonPath("$.errors", hasKey("experienceYears")));

        verifyNoInteractions(service);
    }

    @Test
    void createRequiresEmail() throws Exception {
        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Asha\",\"lastName\":\"Rao\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasKey("email")));
    }

    @Test
    void createRejectsAnUnknownStatus() throws Exception {
        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Asha\",\"lastName\":\"Rao\",\"email\":\"a@b.com\",\"status\":\"MAYBE\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void createRejectsMalformedJson() throws Exception {
        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createReturns409WhenTheEmailAlreadyExists() throws Exception {
        when(service.create(any(CandidateRequest.class))).thenThrow(new DuplicateEmailException("asha@example.com"));

        mvc.perform(post("/api/candidates").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value("A candidate with email asha@example.com already exists"));
    }

    @Test
    void getByIdReturnsTheCandidate() throws Exception {
        when(service.findById(5)).thenReturn(response(5));

        mvc.perform(get("/api/candidates/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    void getByIdReturns404ProblemDetailWhenMissing() throws Exception {
        when(service.findById(99)).thenThrow(new CandidateNotFoundException(99));

        mvc.perform(get("/api/candidates/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Candidate not found with id 99"));
    }

    @Test
    void getByIdWithANonNumericIdIsABadRequest() throws Exception {
        mvc.perform(get("/api/candidates/abc")).andExpect(status().isBadRequest());
    }

    @Test
    void listUsesDefaultPagingAndNoFilters() throws Exception {
        when(service.search(any(), eq(0), eq(20))).thenReturn(emptyPage());

        mvc.perform(get("/api/candidates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(0));

        ArgumentCaptor<CandidateSearchCriteria> captor = ArgumentCaptor.forClass(CandidateSearchCriteria.class);
        verify(service).search(captor.capture(), eq(0), eq(20));
        assertThat(captor.getValue()).isEqualTo(new CandidateSearchCriteria(null, null, null, null, null, null, null));
    }

    @Test
    void listBindsEveryFilterAndPagingParameter() throws Exception {
        when(service.search(any(), eq(2), eq(50))).thenReturn(emptyPage());

        mvc.perform(get(URI.create("/api/candidates?name=asha%20rao&email=acme&location=bengal"
                        + "&skills=java,spring&skills=docker&minExperience=2&maxExperience=8&status=HIRED&page=2&size=50")))
                .andExpect(status().isOk());

        ArgumentCaptor<CandidateSearchCriteria> captor = ArgumentCaptor.forClass(CandidateSearchCriteria.class);
        verify(service).search(captor.capture(), eq(2), eq(50));
        CandidateSearchCriteria criteria = captor.getValue();
        assertThat(criteria.name()).isEqualTo("asha rao");
        assertThat(criteria.email()).isEqualTo("acme");
        assertThat(criteria.location()).isEqualTo("bengal");
        assertThat(criteria.skills()).containsExactly("java", "spring", "docker");
        assertThat(criteria.minExperience()).isEqualTo(2);
        assertThat(criteria.maxExperience()).isEqualTo(8);
        assertThat(criteria.status()).isEqualTo(CandidateStatus.HIRED);
    }

    @Test
    void listRejectsLowercaseStatus() throws Exception {
        mvc.perform(get("/api/candidates?status=hired")).andExpect(status().isBadRequest());

        verify(service, never()).search(any(), any(Integer.class), any(Integer.class));
    }

    @Test
    void listRejectsNonNumericExperience() throws Exception {
        mvc.perform(get("/api/candidates?minExperience=abc")).andExpect(status().isBadRequest());
    }

    @Test
    void listReturnsTheContentOfThePage() throws Exception {
        when(service.search(any(), eq(0), eq(20))).thenReturn(new PageResponse<>(List.of(response(2), response(1)), 0, 20, 2, 1));

        mvc.perform(get("/api/candidates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(2))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void statsHasItsOwnRouteAndIsNotTreatedAsAnId() throws Exception {
        when(service.stats()).thenReturn(new CandidateStats(3, 2.5, Map.of(CandidateStatus.NEW, 3L)));

        mvc.perform(get("/api/candidates/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.averageExperience").value(2.5))
                .andExpect(jsonPath("$.byStatus.NEW").value(3));

        verify(service, never()).findById(any());
    }

    @Test
    void updateReturnsTheUpdatedCandidate() throws Exception {
        when(service.update(eq(5), any(CandidateRequest.class))).thenReturn(response(5));

        mvc.perform(put("/api/candidates/5").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5));
    }

    @Test
    void updateValidatesTheBodyToo() throws Exception {
        mvc.perform(put("/api/candidates/5").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"\",\"lastName\":\"Rao\",\"email\":\"a@b.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasKey("firstName")));

        verifyNoInteractions(service);
    }

    @Test
    void updateReturns404ForAnUnknownCandidate() throws Exception {
        when(service.update(eq(99), any(CandidateRequest.class))).thenThrow(new CandidateNotFoundException(99));

        mvc.perform(put("/api/candidates/99").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateReturns409WhenTheEmailBelongsToSomeoneElse() throws Exception {
        when(service.update(eq(5), any(CandidateRequest.class))).thenThrow(new DuplicateEmailException("asha@example.com"));

        mvc.perform(put("/api/candidates/5").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isConflict());
    }

    @Test
    void deleteReturns204WithNoBody() throws Exception {
        mvc.perform(delete("/api/candidates/5"))
                .andExpect(status().isNoContent())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(""));

        verify(service).delete(5);
    }

    @Test
    void deleteReturns404ForAnUnknownCandidate() throws Exception {
        org.mockito.Mockito.doThrow(new CandidateNotFoundException(99)).when(service).delete(99);

        mvc.perform(delete("/api/candidates/99")).andExpect(status().isNotFound());
    }
}
