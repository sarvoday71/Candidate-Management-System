package com.candidatemgmt.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class CandidateServiceTest {

    private static final CandidateSearchCriteria NO_FILTERS = new CandidateSearchCriteria(null, null, null, null, null, null, null);

    @Mock
    private CandidateRepository repository;

    @InjectMocks
    private CandidateService service;

    private static CandidateRequest request(String first, String last, String email, List<String> skills, Integer experience, CandidateStatus status) {
        return new CandidateRequest(first, last, email, null, skills, experience, null, null, status);
    }

    private static Candidate existing(int id) {
        Candidate candidate = new Candidate();
        candidate.setId(id);
        candidate.setFirstName("Old");
        candidate.setLastName("Name");
        candidate.setEmail("old@example.com");
        candidate.setStatus(CandidateStatus.HIRED);
        return candidate;
    }

    private static CandidateRepository.StatusStats row(CandidateStatus status, long total, long experienceSum) {
        return new CandidateRepository.StatusStats() {
            @Override
            public CandidateStatus getStatus() {
                return status;
            }

            @Override
            public long getTotal() {
                return total;
            }

            @Override
            public long getExperienceSum() {
                return experienceSum;
            }
        };
    }

    @Test
    void createAppliesDefaultsWhenOptionalFieldsAreMissing() {
        when(repository.saveAndFlush(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse response = service.create(request("Asha", "Rao", "asha@example.com", null, null, null));

        assertThat(response.status()).isEqualTo(CandidateStatus.NEW);
        assertThat(response.experienceYears()).isZero();
        assertThat(response.skills()).isEmpty();
    }

    @Test
    void createTrimsNamesAndCleansSkills() {
        when(repository.saveAndFlush(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse response = service.create(request("  Asha ", " Rao  ", "asha@example.com",
                java.util.Arrays.asList("Java", " java ", "JAVA", "Spring", "", "   ", null), 3, CandidateStatus.SCREENING));

        assertThat(response.firstName()).isEqualTo("Asha");
        assertThat(response.lastName()).isEqualTo("Rao");
        assertThat(response.skills()).containsExactly("Java", "Spring");
        assertThat(response.status()).isEqualTo(CandidateStatus.SCREENING);
    }

    @Test
    void createMapsEmailUniqueViolationToDuplicateEmail() {
        when(repository.saveAndFlush(any(Candidate.class))).thenThrow(new DataIntegrityViolationException("insert failed",
                new RuntimeException("ERROR: duplicate key value violates unique constraint \"candidate_email_key\"")));

        assertThatThrownBy(() -> service.create(request("Asha", "Rao", "asha@example.com", null, null, null)))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessageContaining("asha@example.com");
    }

    @Test
    void createRethrowsOtherIntegrityViolations() {
        DataIntegrityViolationException other = new DataIntegrityViolationException("insert failed",
                new RuntimeException("ERROR: null value in column \"first_name\" violates not-null constraint"));
        when(repository.saveAndFlush(any(Candidate.class))).thenThrow(other);

        assertThatThrownBy(() -> service.create(request("Asha", "Rao", "asha@example.com", null, null, null)))
                .isSameAs(other);
    }

    @Test
    void updateReplacesEveryField() {
        Candidate candidate = existing(7);
        when(repository.findById(7)).thenReturn(Optional.of(candidate));
        when(repository.saveAndFlush(candidate)).thenReturn(candidate);

        CandidateResponse response = service.update(7, new CandidateRequest("New", "Person", "new@example.com", "123",
                List.of("Go"), 9, "Acme", "Pune", CandidateStatus.OFFERED));

        assertThat(response.id()).isEqualTo(7);
        assertThat(response.firstName()).isEqualTo("New");
        assertThat(response.email()).isEqualTo("new@example.com");
        assertThat(response.skills()).containsExactly("Go");
        assertThat(response.experienceYears()).isEqualTo(9);
        assertThat(response.currentCompany()).isEqualTo("Acme");
        assertThat(response.currentLocation()).isEqualTo("Pune");
        assertThat(response.status()).isEqualTo(CandidateStatus.OFFERED);
    }

    @Test
    void updateOfUnknownCandidateIsNotFound() {
        when(repository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99, request("A", "B", "a@b.com", null, null, null)))
                .isInstanceOf(CandidateNotFoundException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void updateMapsEmailUniqueViolationToDuplicateEmail() {
        Candidate candidate = existing(7);
        when(repository.findById(7)).thenReturn(Optional.of(candidate));
        when(repository.saveAndFlush(candidate)).thenThrow(new DataIntegrityViolationException("update failed",
                new RuntimeException("duplicate key value violates unique constraint \"candidate_email_key\"")));

        assertThatThrownBy(() -> service.update(7, request("A", "B", "taken@example.com", null, null, null)))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void findByIdReturnsTheCandidate() {
        when(repository.findById(7)).thenReturn(Optional.of(existing(7)));

        assertThat(service.findById(7).firstName()).isEqualTo("Old");
    }

    @Test
    void findByIdOfUnknownCandidateIsNotFound() {
        when(repository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99))
                .isInstanceOf(CandidateNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void deleteRemovesTheCandidateWithASingleStatement() {
        when(repository.deleteCandidateById(7)).thenReturn(1);

        service.delete(7);

        verify(repository).deleteCandidateById(7);
        verify(repository, never()).findById(any());
    }

    @Test
    void deleteOfUnknownCandidateIsNotFound() {
        when(repository.deleteCandidateById(99)).thenReturn(0);

        assertThatThrownBy(() -> service.delete(99)).isInstanceOf(CandidateNotFoundException.class);
    }

    @ParameterizedTest(name = "page={0}, size={1} is queried as page={2}, size={3}")
    @CsvSource({
            "0,   20,    0, 20",
            "3,   50,    3, 50",
            "2,   100,   2, 100",
            "1,   1000,  1, 100",
            "-5,  20,    0, 20",
            "0,   0,     0, 1",
            "0,   -10,   0, 1",
    })
    void searchClampsPageAndSize(int page, int size, int expectedPage, int expectedSize) {
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());

        service.search(NO_FILTERS, page, size);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(any(Specification.class), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isEqualTo(expectedPage);
        assertThat(captor.getValue().getPageSize()).isEqualTo(expectedSize);
    }

    @Test
    void searchAlwaysSortsNewestFirst() {
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());

        service.search(NO_FILTERS, 0, 20);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(any(Specification.class), captor.capture());
        assertThat(captor.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Test
    void searchMapsEntitiesToResponsesAndKeepsPageMetadata() {
        Page<Candidate> page = new PageImpl<>(List.of(existing(2), existing(1)), org.springframework.data.domain.PageRequest.of(1, 2), 5);
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PageResponse<CandidateResponse> result = service.search(NO_FILTERS, 1, 2);

        assertThat(result.content()).extracting(CandidateResponse::id).containsExactly(2, 1);
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(2);
        assertThat(result.totalElements()).isEqualTo(5);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test
    void statsListsEveryStatusEvenWhenThereAreNoCandidates() {
        when(repository.statsByStatus()).thenReturn(List.of());

        CandidateStats stats = service.stats();

        assertThat(stats.total()).isZero();
        assertThat(stats.averageExperience()).isZero();
        assertThat(stats.byStatus()).containsOnlyKeys(CandidateStatus.values());
        assertThat(stats.byStatus().values()).containsOnly(0L);
    }

    @Test
    void statsCombinesRowsAndRoundsTheAverageToOneDecimal() {
        when(repository.statsByStatus()).thenReturn(List.of(
                row(CandidateStatus.NEW, 2, 3),
                row(CandidateStatus.HIRED, 1, 4)));

        CandidateStats stats = service.stats();

        assertThat(stats.total()).isEqualTo(3);
        assertThat(stats.averageExperience()).isEqualTo(2.3); // 7 / 3 = 2.333...
        assertThat(stats.byStatus().get(CandidateStatus.NEW)).isEqualTo(2);
        assertThat(stats.byStatus().get(CandidateStatus.HIRED)).isEqualTo(1);
        assertThat(stats.byStatus().get(CandidateStatus.REJECTED)).isZero();
    }
}
