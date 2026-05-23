package com.tetramobile.tetra.invoice;

public class InvoicePdfException extends RuntimeException {

    public InvoicePdfException(String message, Throwable cause) {
        super(message, cause);
    }

    public InvoicePdfException(String message) {
        super(message);
    }
}
