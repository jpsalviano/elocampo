package com.elocampo.product;

import com.elocampo.product.ProductCategory;

public record ProductFilter(
        String description,
        ProductCategory category,
        String vendorCity,
        String vendorState
        ) {}
