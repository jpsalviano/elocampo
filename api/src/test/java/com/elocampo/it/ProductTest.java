package com.elocampo.it;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ProductTest extends IntegrationTest {

    static final String INPUT = """
            {"description":"Alterado","category":"FRUIT","scale":"KG","quantity":5,"price":2.5,"availabilityDate":0}
            """;

    @Test
    void aVendorHasAtMostFiftyProducts() throws Exception {
        var vendor = person("VENDOR");
        for (int i = 0; i < 50; i++) product(vendor, "Produto " + i, "1.00", 1);
        assertThat(status(send("POST", "/product", vendor.token(), INPUT))).isEqualTo(400);
    }

    @Test
    void onlyVendorsSell() throws Exception {
        var buyer = person("BUYER");
        var result = send("POST", "/product", buyer.token(), INPUT);
        assertThat(status(result)).isEqualTo(400);
    }

    @Test
    void aProductBelongsToItsVendorWhateverTheBodySays() throws Exception {
        var vendor = person("VENDOR");
        var other = person("VENDOR");
        var body = INPUT.replace("{\"description\"", "{\"vendorAccountId\":\"" + other.accountId() + "\",\"description\"");
        var created = send("POST", "/product", vendor.token(), body);
        assertThat((String) json(created, "$.vendorAccountId")).isEqualTo(vendor.accountId());
    }

    @Test
    void onlyTheVendorOrAnAdminChangesAProduct() throws Exception {
        var vendor = person("VENDOR");
        var other = person("VENDOR");
        var id = product(vendor, "Tomate", "7.80", 10);
        assertThat(status(send("PUT", "/product/" + id, other.token(), INPUT))).isEqualTo(403);
        assertThat(status(send("PUT", "/product/" + id + "/deactivate", other.token(), null))).isEqualTo(403);
        assertThat(status(send("DELETE", "/product/" + id, other.token(), null))).isEqualTo(403);
        assertThat(status(send("PUT", "/product/" + id, vendor.token(), INPUT))).isEqualTo(200);
        assertThat(status(send("PUT", "/product/" + id + "/deactivate", admin().token(), null))).isEqualTo(204);
    }

    @Test
    void theCatalogShowsOnlyWhatIsOnSale() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var onSale = product(vendor, "Manga", "6.50", 10);
        var paused = product(vendor, "Banana", "5.20", 10);
        var gone = product(vendor, "Caqui", "9.00", 10);
        send("PUT", "/product/" + paused + "/deactivate", vendor.token(), null);
        send("DELETE", "/product/" + gone, vendor.token(), null);
        List<String> catalog = json(get("/product/query", buyer.token()), "$[*].id");
        assertThat(catalog).containsExactly(onSale);
        List<String> forBuyer = json(get("/product/vendor/" + vendor.accountId(), buyer.token()), "$[*].id");
        assertThat(forBuyer).containsExactly(onSale);
        List<String> forVendor = json(get("/product/vendor/" + vendor.accountId(), vendor.token()), "$[*].id");
        assertThat(forVendor).containsExactlyInAnyOrder(onSale, paused);
    }

    @Test
    void searchTextIsLiteralNotARegularExpression() throws Exception {
        var vendor = person("VENDOR");
        product(vendor, "Feijão (carioca)", "8.90", 10);
        var buyer = person("BUYER");
        List<String> hit = json(get("/product/query?description=(carioca)", buyer.token()), "$[*].description");
        assertThat(hit).containsExactly("Feijão (carioca)");
        List<String> none = json(get("/product/query?description=.*", buyer.token()), "$[*].description");
        assertThat(none).isEmpty();
        assertThat(status(get("/product/query?description=(a+)+$", buyer.token()))).isEqualTo(200);
    }

    @Test
    void onlyBuyersWhoReceivedItReviewAProductAndOnce() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var id = product(vendor, "Queijo", "38.00", 10);
        var review = "{\"stars\":5,\"content\":\"Ótimo\"}";
        assertThat(status(send("POST", "/product/" + id + "/evaluate", buyer.token(), review))).isEqualTo(400);
        var orderId = order(buyer, id, "1");
        changeStatus(vendor, orderId, "COMPLETED");
        assertThat(status(send("POST", "/product/" + id + "/evaluate", buyer.token(), review))).isEqualTo(200);
        assertThat(status(send("POST", "/product/" + id + "/evaluate", buyer.token(), review))).isEqualTo(400);
    }
}
