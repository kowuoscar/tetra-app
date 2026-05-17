package com.tetramobile.tetra.phone;

import org.springframework.stereotype.Component;

/**
 * Stub listener for request side-effects on phones (phone_repair, phone_replacement).
 * Wired in plan-03 when RequestService emits RequestStatusChangedEvent.
 */
@Component
public class PhoneRequestEventListener {
    // @TransactionalEventListener methods added in plan-03
}
