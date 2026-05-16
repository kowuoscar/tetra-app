package com.tetramobile.tetra.shared.exception;

import lombok.Getter;

@Getter
public class UnprocessableEntityException extends RuntimeException {

    private final String code;

    public UnprocessableEntityException(String code, String message) {
        super(message);
        this.code = code;
    }
}
