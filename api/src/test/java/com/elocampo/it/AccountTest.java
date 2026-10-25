package com.elocampo.it;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountTest extends IntegrationTest {

    @Test
    void theAccountBelongsToTheLoggedInUserWhateverTheBodySays() throws Exception {
        var other = person("BUYER");
        var token = signUp("nova@example.com");
        var body = accountJson("VENDOR", "Nova", "52998224725").replace("{\"name\"", "{\"userId\":\"" + other.userId() + "\",\"name\"");
        var created = send("POST", "/account", token, body);
        assertThat(status(created)).isEqualTo(201);
        assertThat((String) json(created, "$.userId")).isNotEqualTo(other.userId());
        assertThat(status(send("POST", "/account", token, accountJson("VENDOR", "De novo", "11144477735")))).isEqualTo(400);
    }

    @Test
    void othersSeeOnlyThePublicProfile() throws Exception {
        var owner = person("VENDOR");
        var other = person("BUYER");
        var mine = get("/account/" + owner.accountId(), owner.token());
        assertThat((String) json(mine, "$.cpf")).isNotBlank();
        assertThat((String) json(mine, "$.address.street")).isEqualTo("Rua A");
        var theirs = get("/account/" + owner.accountId(), other.token()).getResponse().getContentAsString();
        assertThat(theirs).contains("Montes Claros").doesNotContain("cpf", "phone", "Rua A", "birthdayDate", "postalCode");
    }

    @Test
    void onlyTheOwnerOrAnAdminEdits() throws Exception {
        var owner = person("VENDOR");
        var other = person("VENDOR");
        var edit = accountJson("VENDOR", "Invasor", "00000000000");
        assertThat(status(send("PUT", "/account/" + owner.accountId(), other.token(), edit))).isEqualTo(403);
        assertThat(status(send("PUT", "/account/" + owner.accountId(), owner.token(), edit))).isEqualTo(200);
        assertThat(status(send("PUT", "/account/" + owner.accountId(), admin().token(), edit))).isEqualTo(200);
    }

    @Test
    void lookingUpByUserIsOnlyForOneself() throws Exception {
        var owner = person("BUYER");
        var other = person("BUYER");
        assertThat(status(get("/account/user/" + owner.userId(), owner.token()))).isEqualTo(200);
        assertThat(status(get("/account/user/" + owner.userId(), other.token()))).isEqualTo(403);
    }

    @Test
    void onlyAdminsDeactivateAccounts() throws Exception {
        var owner = person("BUYER");
        assertThat(status(send("PUT", "/account/" + owner.accountId() + "/deactivate", owner.token(), null))).isEqualTo(403);
        assertThat(status(send("PUT", "/account/" + owner.accountId() + "/deactivate", admin().token(), null))).isEqualTo(204);
    }
}
