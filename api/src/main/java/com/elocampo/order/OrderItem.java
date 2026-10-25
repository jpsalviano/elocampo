package com.elocampo.order;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @NotNull(message = "productId is required")
    private UUID productId;

    // Vem do produto: o que o cliente mandar é ignorado.
    private String description;

    @NotNull(message = "quantity is required")
    @jakarta.validation.constraints.DecimalMin(value = "0.001", message = "quantity must be greater than zero")
    @jakarta.validation.constraints.DecimalMax(value = "1000000", message = "quantity is too large")
    private BigDecimal quantity;

    // Vem do produto: o que o cliente mandar é ignorado.
    private BigDecimal price;
}
