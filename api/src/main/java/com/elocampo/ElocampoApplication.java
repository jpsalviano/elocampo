package com.elocampo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

// Uma aplicação com um pacote por domínio (auth, account, product, order, file,
// chat). Cada um era um serviço atrás de um gateway; os domínios continuam se
// falando só pelos services uns dos outros, nunca pelos repositórios.
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class ElocampoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ElocampoApplication.class, args);
    }
}
