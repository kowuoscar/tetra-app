package com.tetramobile.tetra;

import com.tetramobile.tetra.storage.MinioProperties;
import com.tetramobile.tetra.whatsapp.WhatsAppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({MinioProperties.class, WhatsAppProperties.class})
public class TetraApplication {

    public static void main(String[] args) {
        SpringApplication.run(TetraApplication.class, args);
    }
}
