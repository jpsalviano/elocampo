package com.elocampo.it;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AuthTest extends IntegrationTest {

    @Test
    void signUpCannotMakeAnAdmin() throws Exception {
        var created = send("POST", "/user", null,
                "{\"email\":\"esperto@example.com\",\"password\":\"%s\",\"isAdmin\":true,\"admin\":true}".formatted(PASSWORD));
        assertThat(status(created)).isEqualTo(201);
        assertThat((Boolean) json(created, "$.isAdmin")).isFalse();
        var token = login("esperto@example.com");
        assertThat(status(get("/user/all", token))).isEqualTo(403);
        assertThat(status(get("/account/all", token))).isEqualTo(403);
        assertThat(status(get("/order/all", token))).isEqualTo(403);
    }

    @Test
    void adminRoutesAnswerAnAdmin() throws Exception {
        var admin = admin();
        assertThat(status(get("/user/all", admin.token()))).isEqualTo(200);
        assertThat(status(get("/product/all", admin.token()))).isEqualTo(200);
    }

    @Test
    void everythingButLoginSignUpHealthAndDemoNeedsAToken() throws Exception {
        assertThat(status(get("/health", null))).isEqualTo(200);
        assertThat(status(get("/demo", null))).isEqualTo(200);
        assertThat(status(get("/product/query", null))).isEqualTo(401);
        assertThat(status(get("/account/" + UUID.randomUUID(), null))).isEqualTo(401);
        assertThat(status(get("/product/query", "not-a-token"))).isEqualTo(401);
    }

    @Test
    void wrongPasswordAndUnknownEmailLookTheSame() throws Exception {
        signUp("ana@example.com");
        var wrongPassword = send("POST", "/token", null, "{\"email\":\"ana@example.com\",\"password\":\"errada123\"}");
        var unknown = send("POST", "/token", null, "{\"email\":\"ninguem@example.com\",\"password\":\"errada123\"}");
        assertThat(status(wrongPassword)).isEqualTo(400);
        assertThat(wrongPassword.getResponse().getContentAsString()).isEqualTo(unknown.getResponse().getContentAsString());
    }

    @Test
    void emailIsCaseInsensitiveAndUnique() throws Exception {
        signUp("Bia@Example.com");
        assertThat(login("bia@example.com")).isNotBlank();
        var again = send("POST", "/user", null, "{\"email\":\"BIA@example.com\",\"password\":\"%s\"}".formatted(PASSWORD));
        assertThat(status(again)).isEqualTo(400);
    }

    @Test
    void shortPasswordIsRefused() throws Exception {
        var result = send("POST", "/user", null, "{\"email\":\"c@example.com\",\"password\":\"123\"}");
        assertThat(status(result)).isEqualTo(400);
    }

    @Test
    void repeatedFailedLoginsAreThrottledPerAddress() throws Exception {
        signUp("dani@example.com");
        for (int i = 0; i < 10; i++) {
            var r = call(post("/token").header("X-Real-IP", "203.0.113.9").contentType("application/json")
                    .content("{\"email\":\"dani@example.com\",\"password\":\"errada123\"}"), null);
            assertThat(status(r)).isEqualTo(400);
        }
        var blocked = call(post("/token").header("X-Real-IP", "203.0.113.9").contentType("application/json")
                .content("{\"email\":\"dani@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)), null);
        assertThat(status(blocked)).isEqualTo(429);
        var otherAddress = call(post("/token").header("X-Real-IP", "203.0.113.10").contentType("application/json")
                .content("{\"email\":\"dani@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)), null);
        assertThat(status(otherAddress)).isEqualTo(200);
    }

    @Test
    void signUpsAreLimitedPerAddress() throws Exception {
        for (int i = 0; i < 10; i++) {
            var r = call(post("/user").header("X-Real-IP", "192.0.2.50").contentType("application/json")
                    .content("{\"email\":\"lote%d@example.com\",\"password\":\"%s\"}".formatted(i, PASSWORD)), null);
            assertThat(status(r)).isEqualTo(201);
        }
        var blocked = call(post("/user").header("X-Real-IP", "192.0.2.50").contentType("application/json")
                .content("{\"email\":\"lote10@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)), null);
        assertThat(status(blocked)).isEqualTo(429);
    }

    @Test
    void aDeactivatedUsersTokenStopsWorking() throws Exception {
        var buyer = person("BUYER");
        var admin = admin();
        assertThat(status(get("/product/query", buyer.token()))).isEqualTo(200);
        assertThat(status(send("PUT", "/user/" + buyer.userId() + "/deactivate", admin.token(), null))).isEqualTo(204);
        assertThat(status(get("/product/query", buyer.token()))).isEqualTo(401);
    }

    @Test
    void usersSeeOnlyThemselves() throws Exception {
        var a = person("BUYER");
        var b = person("BUYER");
        assertThat(status(get("/user/" + a.userId(), a.token()))).isEqualTo(200);
        assertThat(status(get("/user/" + a.userId(), b.token()))).isEqualTo(403);
        assertThat(status(get("/user/email/x@example.com", a.token()))).isEqualTo(403);
    }

    @Test
    void errorsNeverLeakInternals() throws Exception {
        var result = send("POST", "/user", null, "{not json");
        assertThat(status(result)).isEqualTo(400);
        assertThat(result.getResponse().getContentAsString()).doesNotContain("Exception", "at com.");
    }
}
