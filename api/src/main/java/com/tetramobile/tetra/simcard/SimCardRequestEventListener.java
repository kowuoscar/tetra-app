package com.tetramobile.tetra.simcard;

import org.springframework.stereotype.Component;

/**
 * Stub listener for request side-effects on SIM cards (new_sim).
 * Wired in plan-03 when RequestService emits RequestStatusChangedEvent.
 */
@Component
public class SimCardRequestEventListener {
    // @TransactionalEventListener methods added in plan-03
}
