package com.tetramobile.tetra.shared.config;

import org.jooq.conf.RenderNameCase;
import org.jooq.conf.RenderQuotedNames;
import org.springframework.boot.autoconfigure.jooq.DefaultConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * jOOQ DSL render settings.
 *
 * The jOOQ codegen (DDLDatabase via H2) generates uppercase identifiers.
 * PostgreSQL stores names in lowercase by default, so we configure jOOQ
 * to render unquoted names in lowercase to match the actual table names.
 */
@Configuration
public class JooqConfig {

    @Bean
    public DefaultConfigurationCustomizer jooqConfigCustomizer() {
        return config -> config.settings()
                .withRenderQuotedNames(RenderQuotedNames.NEVER)
                .withRenderNameCase(RenderNameCase.LOWER);
    }
}
