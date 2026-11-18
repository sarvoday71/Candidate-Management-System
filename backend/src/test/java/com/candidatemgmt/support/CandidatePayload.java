package com.candidatemgmt.support;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Builds the JSON request body for POST/PUT without depending on a particular Jackson version. */
public final class CandidatePayload {

    private final Map<String, Object> fields = new LinkedHashMap<>();

    private CandidatePayload() {
    }

    public static CandidatePayload of(String firstName, String lastName, String email) {
        CandidatePayload payload = new CandidatePayload();
        payload.fields.put("firstName", firstName);
        payload.fields.put("lastName", lastName);
        payload.fields.put("email", email);
        return payload;
    }

    public CandidatePayload phone(String value) {
        fields.put("phone", value);
        return this;
    }

    public CandidatePayload skills(String... values) {
        fields.put("skills", values);
        return this;
    }

    public CandidatePayload experience(int years) {
        fields.put("experienceYears", years);
        return this;
    }

    public CandidatePayload company(String value) {
        fields.put("currentCompany", value);
        return this;
    }

    public CandidatePayload location(String value) {
        fields.put("currentLocation", value);
        return this;
    }

    public CandidatePayload status(String value) {
        fields.put("status", value);
        return this;
    }

    /** Overrides an arbitrary field, for sending deliberately invalid data. */
    public CandidatePayload with(String field, Object value) {
        fields.put(field, value);
        return this;
    }

    public String json() {
        return fields.entrySet().stream()
                .map(e -> quote(e.getKey()) + ":" + value(e.getValue()))
                .collect(Collectors.joining(",", "{", "}"));
    }

    private static String value(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String[] array) {
            return Arrays.stream(array).map(CandidatePayload::quote).collect(Collectors.joining(",", "[", "]"));
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        return quote(value.toString());
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
