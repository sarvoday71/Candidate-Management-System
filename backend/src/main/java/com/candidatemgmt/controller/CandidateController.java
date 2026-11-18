package com.candidatemgmt.controller;

import com.candidatemgmt.dto.CandidateRequest;
import com.candidatemgmt.dto.CandidateResponse;
import com.candidatemgmt.dto.CandidateSearchCriteria;
import com.candidatemgmt.dto.CandidateStats;
import com.candidatemgmt.dto.PageResponse;
import com.candidatemgmt.service.CandidateService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService service;

    @PostMapping
    public ResponseEntity<CandidateResponse> create(@Valid @RequestBody CandidateRequest request) {
        CandidateResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/candidates/" + created.id())).body(created);
    }

    @GetMapping
    public PageResponse<CandidateResponse> search(
            @ModelAttribute CandidateSearchCriteria criteria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + CandidateService.DEFAULT_PAGE_SIZE) int size) {
        return service.search(criteria, page, size);
    }

    @GetMapping("/stats")
    public CandidateStats stats() {
        return service.stats();
    }

    @GetMapping("/{id}")
    public CandidateResponse getById(@PathVariable Integer id) {
        return service.findById(id);
    }

    @PutMapping("/{id}")
    public CandidateResponse update(@PathVariable Integer id, @Valid @RequestBody CandidateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
