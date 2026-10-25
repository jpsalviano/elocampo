package com.elocampo.order;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderInput {
    // Ignorado: o comprador é quem está logado.
    private UUID buyerAccountId;

    // Ignorado: o vendedor é o produtor dos produtos.
    private UUID sellerAccountId;

    @NotEmpty(message = "productIds is required")
    @jakarta.validation.constraints.Size(max = 50, message = "at most 50 products per order")
    private List<@jakarta.validation.Valid OrderItem> productsIds;
}
