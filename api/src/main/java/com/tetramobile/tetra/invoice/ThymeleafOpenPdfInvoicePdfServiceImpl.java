package com.tetramobile.tetra.invoice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThymeleafOpenPdfInvoicePdfServiceImpl implements InvoicePdfService {

    private final TemplateEngine templateEngine;

    @Override
    public byte[] generate(InvoiceRenderData data) {
        try {
            Context ctx = new Context();
            ctx.setVariable("invoice", data);

            String html = templateEngine.process("invoice", ctx);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(out);

            return out.toByteArray();
        } catch (Exception e) {
            throw new InvoicePdfException("Failed to generate invoice PDF for invoice " + data.invoiceNumber(), e);
        }
    }
}
