package com.tetramobile.tetra.invoice;

import com.tetramobile.tetra.settings.SystemSettings;

import java.math.BigDecimal;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.UUID;

public record InvoiceRenderData(
        UUID id,
        Integer invoiceNumber,
        int periodMonth,
        int periodYear,
        BigDecimal supportFees,
        BigDecimal supportExpenses,
        BigDecimal rollingAdvanceCurrent,
        BigDecimal rollingAdvancePrevious,
        BigDecimal previousBalance,
        BigDecimal taxes,
        BigDecimal total,
        BankDetails bankDetails
) {

    public record BankDetails(
            String bankAccountHolder,
            String bankIban,
            String bankSwift,
            String companyName,
            String companyAddress
    ) {}

    public String periodLabel() {
        String month = Month.of(periodMonth).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        return month + " " + periodYear;
    }

    public static BankDetails fromSettings(SystemSettings s) {
        return new BankDetails(
                s.getBankAccountHolder(),
                s.getBankIban(),
                s.getBankSwift(),
                s.getCompanyName(),
                s.getCompanyAddress()
        );
    }

    public static InvoiceRenderData from(Invoice invoice, SystemSettings settings) {
        return new InvoiceRenderData(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getPeriodMonth(),
                invoice.getPeriodYear(),
                invoice.getSupportFees(),
                invoice.getSupportExpenses(),
                invoice.getRollingAdvanceCurrent(),
                invoice.getRollingAdvancePrevious(),
                invoice.getPreviousBalance(),
                invoice.getTaxes(),
                invoice.getTotal(),
                fromSettings(settings)
        );
    }
}
