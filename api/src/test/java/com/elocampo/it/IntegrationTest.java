package com.elocampo.it;

import com.elocampo.demo.DemoSeeder;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.file.Files;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

// A aplicação inteira contra um MongoDB de verdade (ELOCAMPO_TEST_MONGODB_URI),
// esvaziado antes de cada teste. As requisições passam pelos filtros de segurança reais.
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    static final String PASSWORD = "senha-forte-123";
    static final java.util.concurrent.atomic.AtomicInteger SIGNUPS = new java.util.concurrent.atomic.AtomicInteger();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("spring.mongodb.uri", () -> System.getenv().getOrDefault(
                "ELOCAMPO_TEST_MONGODB_URI", "mongodb://127.0.0.1:27017/elocampo-test"));
        registry.add("elocampo.jwt-secret", () -> "test-secret-with-at-least-32-bytes!!");
        var files = Files.createTempDirectory("elocampo-files").toString();
        registry.add("elocampo.files-root", () -> files);
        registry.add("elocampo.demo-password", () -> "");
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected MongoTemplate mongo;

    @BeforeEach
    void emptyDatabase() {
        DemoSeeder.COLLECTIONS.forEach(c -> mongo.remove(new Query(), c));
    }

    // --- requisições ---

    protected MvcResult call(org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<?> request, String token) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        return mvc.perform(request).andReturn();
    }

    protected MvcResult get(String path, String token) throws Exception {
        return call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path), token);
    }

    protected MvcResult send(String method, String path, String token, String json) throws Exception {
        var request = request(org.springframework.http.HttpMethod.valueOf(method), path)
                .contentType(MediaType.APPLICATION_JSON);
        if (json != null) request.content(json);
        return call(request, token);
    }

    protected static int status(MvcResult result) {
        return result.getResponse().getStatus();
    }

    protected static <T> T json(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }

    // --- dados de teste criados pela API, como a web faz ---

    protected record Person(String token, String userId, String accountId) {}

    // Cada cadastro de teste vem de um endereço diferente, para não esbarrar no
    // limite de cadastros por endereço (testado à parte em AuthTest).
    protected String signUp(String email) throws Exception {
        var created = call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/user")
                .header("X-Real-IP", "10.0." + (SIGNUPS.get() / 250) + "." + (SIGNUPS.getAndIncrement() % 250))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)), null);
        if (status(created) != 201) throw new AssertionError(created.getResponse().getContentAsString());
        return login(email);
    }

    protected String login(String email) throws Exception {
        var result = send("POST", "/token", null, "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD));
        if (status(result) != 200) throw new AssertionError(result.getResponse().getContentAsString());
        return json(result, "$.token");
    }

    protected Person person(String role) throws Exception {
        var email = role.toLowerCase() + "-" + UUID.randomUUID() + "@example.com";
        var token = signUp(email);
        var account = send("POST", "/account", token, accountJson(role, "Fulano", randomCpf()));
        if (status(account) != 201) throw new AssertionError(account.getResponse().getContentAsString());
        return new Person(token, json(account, "$.userId"), json(account, "$.id"));
    }

    protected Person admin() throws Exception {
        var email = "admin-" + UUID.randomUUID() + "@example.com";
        var token = signUp(email);
        mongo.updateFirst(Query.query(org.springframework.data.mongodb.core.query.Criteria.where("email").is(email)),
                org.springframework.data.mongodb.core.query.Update.update("isAdmin", true), "user");
        return new Person(login(email), null, null);
    }

    protected static String accountJson(String role, String name, String cpf) {
        return """
                {"name":"%s","cpf":"%s","birthdayDate":0,"role":"%s",
                 "address":{"street":"Rua A","number":"1","city":"Montes Claros","district":"Centro","state":"MG","complement":"","postalCode":"39400-000"},
                 "phone":{"countryCode":55,"stateCode":38,"number":"99999-0000"}}
                """.formatted(name, cpf, role);
    }

    protected String product(Person vendor, String description, String price, long quantity) throws Exception {
        var result = send("POST", "/product", vendor.token(), """
                {"description":"%s","category":"VEGETABLE","scale":"KG","quantity":%d,"price":%s,"availabilityDate":0}
                """.formatted(description, quantity, price));
        if (status(result) != 201) throw new AssertionError(result.getResponse().getContentAsString());
        return json(result, "$.id");
    }

    protected String order(Person buyer, String productId, String quantity) throws Exception {
        var result = send("POST", "/order", buyer.token(), """
                {"productsIds":[{"productId":"%s","quantity":%s}]}
                """.formatted(productId, quantity));
        if (status(result) != 201) throw new AssertionError(result.getResponse().getContentAsString());
        return json(result, "$.id");
    }

    protected MvcResult changeStatus(Person who, String orderId, String status) throws Exception {
        return send("PUT", "/order/" + orderId + "/status", who.token(),
                "{\"status\":\"%s\",\"note\":\"mudança de situação\"}".formatted(status));
    }

    private static String randomCpf() {
        return String.valueOf(10_000_000_000L + (long) (Math.random() * 89_999_999_999L));
    }
}
