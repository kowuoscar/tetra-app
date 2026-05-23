package com.tetramobile.tetra.whatsapp;

import com.tetramobile.tetra.invoice.InvoiceSentEvent;
import com.tetramobile.tetra.request.event.RequestCreatedEvent;
import com.tetramobile.tetra.request.event.RequestStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppEventListener {

    private final WhatsAppService whatsAppService;
    private final WhatsAppProperties whatsAppProperties;

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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onInvoiceSent(InvoiceSentEvent event) {
        String groupId = whatsAppProperties.companyGroupId();
        if (groupId == null || groupId.isBlank()) return;
        try {
            String msg = "Invoice #" + event.invoiceNumber() + " for "
                    + event.periodMonth() + "/" + event.periodYear()
                    + " has been sent.";
            whatsAppService.sendText(groupId, msg);
        } catch (Exception e) {
            log.warn("Failed to send WhatsApp notification for InvoiceSentEvent {}: {}",
                    event.invoiceId(), e.getMessage());
        }
    }
}
