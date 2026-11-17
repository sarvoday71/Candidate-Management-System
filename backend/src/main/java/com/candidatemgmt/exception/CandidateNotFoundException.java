package com.candidatemgmt.exception;

public class CandidateNotFoundException extends RuntimeException {

    public CandidateNotFoundException(Integer id) {
        super("Candidate not found with id " + id);
    }
}
