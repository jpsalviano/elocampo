package com.elocampo.product.service;

import com.elocampo.product.ProductEvaluationInput;
import com.elocampo.product.ProductFilter;
import com.elocampo.product.ProductInput;
import com.elocampo.product.ProductResponse;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductService {

    ProductResponse create(@Valid ProductInput request, CurrentUser user);

    ProductResponse update(UUID productId, @Valid ProductInput request, CurrentUser user);

    Optional<ProductResponse> evaluate(UUID productId, @Valid ProductEvaluationInput request, CurrentUser user);

    List<ProductResponse> findAll();

    Optional<ProductResponse> findById(UUID productId);

    List<ProductResponse> findByFilter(ProductFilter filter);

    List<ProductResponse> findByVendorAccountId(UUID vendorAccountId, CurrentUser viewer);

    // AVAILABLE / UNAVAILABLE: se compradores o encontram e podem pedir.
    void setAvailable(UUID productId, boolean available, CurrentUser user);

    // Removido de vez (fica no banco por causa dos pedidos antigos).
    void remove(UUID productId, CurrentUser user);
}
