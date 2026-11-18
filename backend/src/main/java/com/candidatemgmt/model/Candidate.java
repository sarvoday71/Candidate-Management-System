package com.candidatemgmt.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "candidate")
@Getter
@Setter
@NoArgsConstructor
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    // Stored lowercase (see normalize()), so the unique index also rejects case-variant duplicates.
    @Column(nullable = false, unique = true)
    private String email;

    private String phone;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private List<String> skills = new ArrayList<>();

    // Lowercased copy of skills, used only for indexed filtering; never exposed by the API.
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "skills_search", columnDefinition = "text[]", nullable = false)
    private List<String> skillsSearch = new ArrayList<>();

    @Column(name = "experience_years", nullable = false)
    private Integer experienceYears = 0;

    @Column(name = "current_company")
    private String currentCompany;

    @Column(name = "current_location")
    private String currentLocation;

    // Prisma creates a native Postgres enum, so Hibernate must bind it as NAMED_ENUM, not varchar.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "\"CandidateStatus\"")
    private CandidateStatus status = CandidateStatus.NEW;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void normalize() {
        email = email.trim().toLowerCase(Locale.ROOT);
        skillsSearch = skills.stream().map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toCollection(ArrayList::new));
    }
}
