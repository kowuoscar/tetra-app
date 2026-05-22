package com.tetramobile.tetra.whatsapp;

import com.tetramobile.tetra.customer.CustomerQueryRepository;
import com.tetramobile.tetra.customer.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlyCostSummaryJob {

    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;
    private final WhatsAppService whatsAppService;

    @Scheduled(cron = "0 0 8 1 * *")
    public void sendMonthlySummaries() {
        YearMonth prev = YearMonth.now().minusMonths(1);
        int month = prev.getMonthValue();
        int year = prev.getYear();

        log.info("MonthlyCostSummaryJob: sending summaries for {}/{}", month, year);

        customerRepository.findAll().forEach(customer -> {
            try {
                if (customer.getWhatsappGroupId() == null) return;
                var breakdown = customerQueryRepository.getCostBreakdown(
                    customer.getId(), month, year);
                String msg = String.format(
                    "Monthly summary for %s (%d/%d): total €%.2f",
                    customer.getName(), month, year, breakdown.total()
                );
                whatsAppService.sendText(customer.getWhatsappGroupId(), msg);
            } catch (Exception e) {
                log.warn("Monthly summary failed for customer={}: {}",
                    customer.getId(), e.getMessage());
            }
        });
    }
}
