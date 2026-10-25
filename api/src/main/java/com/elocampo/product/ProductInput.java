package com.elocampo.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductInput {

    // Ignorado: o produto é do produtor logado.
    private UUID vendorAccountId;

    @NotBlank(message = "description is required")
    @Size(max = 255, message = "description cannot be greater than 255 characters")
    private String description;

    @NotNull(message = "category is required")
    private ProductCategory category;

    @NotNull(message = "scale is required")
    private ProductScale scale;

    @NotNull(message = "quantity is required")
    @jakarta.validation.constraints.PositiveOrZero(message = "quantity cannot be negative")
    @jakarta.validation.constraints.Max(value = 1_000_000, message = "quantity is too large")
    private Long quantity;

    @NotNull(message = "price is required")
    @Positive(message = "price must be greater than zero")
    @jakarta.validation.constraints.Digits(integer = 7, fraction = 2, message = "price must have at most 7 digits and 2 decimals")
    private BigDecimal price;

    @NotNull(message = "availabilityDate is required")
    private Long availabilityDate;

    // Ignorado: as imagens são enviadas como arquivos (FileService).
    private List<String> imageUrls;
}
