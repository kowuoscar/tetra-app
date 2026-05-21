package com.tetramobile.tetra.whatsapp;

import com.tetramobile.tetra.request.event.RequestCreatedEvent;
import com.tetramobile.tetra.request.event.RequestStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppEventListener {

    private final WhatsAppService whatsAppService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRequestCreated(RequestCreatedEvent event) {
        if (event.customerWhatsappGroupId() == null) return;
        String msg = "New request submitted: " + event.requestType().name().replace("_", " ");
        whatsAppService.sendText(event.customerWhatsappGroupId(), msg);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatusChanged(RequestStatusChangedEvent event) {
        if (event.customerWhatsappGroupId() == null) return;
        String msg = "Request update: status changed to " + event.newStatus().name();
        whatsAppService.sendText(event.customerWhatsappGroupId(), msg);
    }
}
