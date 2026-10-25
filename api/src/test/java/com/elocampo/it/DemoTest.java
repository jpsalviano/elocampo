package com.elocampo.it;

import com.elocampo.config.ElocampoProperties;
import com.elocampo.demo.DemoSeeder;
import com.elocampo.file.service.FileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.file.Files;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DemoTest extends IntegrationTest {

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    FileService fileService;

    @Test
    void theResetErasesEverythingAndSeedsTheSampleAccounts() throws Exception {
        var outsider = person("BUYER");
        var properties = new ElocampoProperties("test-secret-with-at-least-32-bytes!!", 12,
                Files.createTempDirectory("demo").toString(), PASSWORD, "-", "America/Sao_Paulo");
        new DemoSeeder(properties, mongo, passwordEncoder, fileService).reset();

        assertThat(status(get("/product/query", outsider.token()))).isEqualTo(401);
        var buyer = login(DemoSeeder.BUYER_EMAIL);
        List<String> catalog = json(get("/product/query", buyer), "$[*].description");
        assertThat(catalog).hasSize(8).contains("Feijão carioca").doesNotContain("Banana prata");
        var admin = login(DemoSeeder.ADMIN_EMAIL);
        assertThat((Integer) json(get("/order/all", admin), "$.length()")).isEqualTo(5);
        login(DemoSeeder.VENDOR_EMAIL);
    }
}
