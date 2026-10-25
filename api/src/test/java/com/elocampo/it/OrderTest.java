package com.elocampo.it;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderTest extends IntegrationTest {

    @Test
    void priceAndDescriptionComeFromTheProduct() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var id = product(vendor, "Feijão", "8.90", 100);
        var created = send("POST", "/order", buyer.token(), """
                {"sellerAccountId":"%s","productsIds":[{"productId":"%s","description":"Barato","quantity":10,"price":0.01}]}
                """.formatted(buyer.accountId(), id));
        assertThat(status(created)).isEqualTo(201);
        assertThat(((Number) json(created, "$.price")).doubleValue()).isEqualTo(89.0);
        assertThat((String) json(created, "$.products[0].description")).isEqualTo("Feijão");
        assertThat((String) json(created, "$.sellerAccountId")).isEqualTo(vendor.accountId());
        assertThat((String) json(created, "$.buyerAccountId")).isEqualTo(buyer.accountId());
    }

    @Test
    void ordersRespectStockAvailabilityAndOneVendor() throws Exception {
        var vendor = person("VENDOR");
        var vendor2 = person("VENDOR");
        var buyer = person("BUYER");
        var a = product(vendor, "Milho", "1.20", 5);
        var b = product(vendor2, "Alface", "3.50", 5);
        var paused = product(vendor, "Ovos", "14.00", 5);
        send("PUT", "/product/" + paused + "/deactivate", vendor.token(), null);
        assertThat(status(send("POST", "/order", buyer.token(), "{\"productsIds\":[{\"productId\":\"%s\",\"quantity\":6}]}".formatted(a)))).isEqualTo(400);
        assertThat(status(send("POST", "/order", buyer.token(), "{\"productsIds\":[{\"productId\":\"%s\",\"quantity\":1}]}".formatted(paused)))).isEqualTo(400);
        assertThat(status(send("POST", "/order", buyer.token(), "{\"productsIds\":[{\"productId\":\"%s\",\"quantity\":1},{\"productId\":\"%s\",\"quantity\":1}]}".formatted(a, b)))).isEqualTo(400);
        assertThat(status(send("POST", "/order", buyer.token(), "{\"productsIds\":[{\"productId\":\"%s\",\"quantity\":0}]}".formatted(a)))).isEqualTo(400);
        assertThat(status(send("POST", "/order", vendor2.token(), "{\"productsIds\":[{\"productId\":\"%s\",\"quantity\":1}]}".formatted(a)))).isEqualTo(400);
    }

    @Test
    void theSellerMovesTheOrderAndTheBuyerCanOnlyCancelWhilePending() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var id = product(vendor, "Manga", "6.50", 50);
        var first = order(buyer, id, "2");
        assertThat(status(changeStatus(buyer, first, "ACCEPTED"))).isEqualTo(403);
        assertThat(status(changeStatus(buyer, first, "COMPLETED"))).isEqualTo(403);
        assertThat(status(changeStatus(vendor, first, "ACCEPTED"))).isEqualTo(204);
        assertThat(status(changeStatus(buyer, first, "CANCELLED"))).isEqualTo(403);
        assertThat(status(changeStatus(vendor, first, "COMPLETED"))).isEqualTo(204);
        var second = order(buyer, id, "1");
        assertThat(status(changeStatus(buyer, second, "CANCELLED"))).isEqualTo(204);
    }

    @Test
    void onlyThePartiesAndAdminsSeeAnOrder() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var stranger = person("BUYER");
        var id = order(buyer, product(vendor, "Tomate", "7.80", 10), "1");
        assertThat(status(get("/order/" + id, buyer.token()))).isEqualTo(200);
        assertThat(status(get("/order/" + id, vendor.token()))).isEqualTo(200);
        assertThat(status(get("/order/" + id, stranger.token()))).isEqualTo(403);
        assertThat(status(get("/order/" + id, admin().token()))).isEqualTo(200);
        assertThat(status(changeStatus(stranger, id, "CANCELLED"))).isEqualTo(403);
        assertThat(status(get("/order/buyer/" + buyer.accountId(), stranger.token()))).isEqualTo(403);
        assertThat(status(get("/order/seller/" + vendor.accountId(), stranger.token()))).isEqualTo(403);
        assertThat(status(get("/order/buyer/" + buyer.accountId(), buyer.token()))).isEqualTo(200);
        assertThat(status(get("/order/seller/" + vendor.accountId(), vendor.token()))).isEqualTo(200);
    }

    @Test
    void accountReviewsNeedACompletedOrderBetweenThem() throws Exception {
        var vendor = person("VENDOR");
        var buyer = person("BUYER");
        var product = product(vendor, "Doce", "18.50", 10);
        var review = "{\"stars\":4,\"productId\":\"%s\",\"content\":\"Bom\"}".formatted(product);
        assertThat(status(send("POST", "/account/" + vendor.accountId() + "/evaluate", buyer.token(), review))).isEqualTo(400);
        changeStatus(vendor, order(buyer, product, "1"), "COMPLETED");
        assertThat(status(send("POST", "/account/" + vendor.accountId() + "/evaluate", buyer.token(), review))).isEqualTo(200);
        assertThat(status(send("POST", "/account/" + vendor.accountId() + "/evaluate", buyer.token(), review))).isEqualTo(400);
        assertThat(status(send("POST", "/account/" + buyer.accountId() + "/evaluate", vendor.token(), review))).isEqualTo(200);
        assertThat(status(send("POST", "/account/" + buyer.accountId() + "/evaluate", buyer.token(), review))).isEqualTo(400);
        assertThat((Integer) json(get("/account/" + vendor.accountId() + "/evaluations", buyer.token()), "$.length()")).isEqualTo(1);
    }
}
