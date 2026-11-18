package com.candidatemgmt.support;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.candidatemgmt.repository.CandidateRepository;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.net.URI;
import java.sql.Connection;
import java.sql.Statement;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.jayway.jsonpath.JsonPath;

/**
 * Starts one real PostgreSQL (same version as production, no Docker needed) for the whole test run
 * and builds the schema from src/test/resources/schema.sql, which is generated from prisma/schema.prisma
 * (npm run db:test-schema). The queries under test use Postgres-only features (ILIKE, text[], native
 * enums), so an H2 stand-in would not prove anything.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {

    protected static final String API = "/api/candidates";

    private static final EmbeddedPostgres POSTGRES = startAndMigrate();

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected CandidateRepository repository;

    @Autowired
    private CacheManager cacheManager;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://localhost:" + POSTGRES.getPort() + "/postgres");
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @BeforeEach
    void resetState() {
        repository.deleteAll();
        cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
    }

    protected ResultActions post(CandidatePayload payload) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(API).contentType(MediaType.APPLICATION_JSON).content(payload.json()));
    }

    protected ResultActions put(int id, CandidatePayload payload) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.put(API + "/" + id).contentType(MediaType.APPLICATION_JSON).content(payload.json()));
    }

    /** GET with an already-encoded query string; avoids MockMvc encoding it a second time. */
    protected ResultActions search(String encodedQuery) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.get(URI.create(API + (encodedQuery.isEmpty() ? "" : "?" + encodedQuery))));
    }

    protected int create(CandidatePayload payload) throws Exception {
        String body = post(payload).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private static EmbeddedPostgres startAndMigrate() {
        try {
            EmbeddedPostgres postgres = EmbeddedPostgres.builder().start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    postgres.close();
                } catch (IOException ignored) {
                    // best effort on JVM shutdown
                }
            }));
            String schema = new String(PostgresIntegrationTest.class.getResourceAsStream("/schema.sql").readAllBytes(), UTF_8);
            try (Connection connection = postgres.getPostgresDatabase().getConnection();
                    Statement statement = connection.createStatement()) {
                statement.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm");
                statement.execute(schema);
            }
            return postgres;
        } catch (Exception e) {
            throw new IllegalStateException("Could not start the embedded PostgreSQL used by the tests", e);
        }
    }
}
