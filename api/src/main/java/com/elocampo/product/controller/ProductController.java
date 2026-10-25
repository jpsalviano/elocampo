package com.elocampo.product.controller;

import com.elocampo.product.ProductCategory;
import com.elocampo.product.ProductEvaluationInput;
import com.elocampo.product.ProductFilter;
import com.elocampo.product.ProductInput;
import com.elocampo.product.ProductResponse;
import com.elocampo.product.service.ProductService;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/product")
@RequiredArgsConstructor
@Validated
public class ProductController {

    private final ProductService productService;

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request, CurrentUser.get()));
    }

    // Só admin (SecurityConfig).
    @GetMapping("/all")
    public ResponseEntity<List<ProductResponse>> findAll() {
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> findById(@PathVariable UUID id) {
        return productService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(@PathVariable UUID id, @Valid @RequestBody ProductInput request) {
        return ResponseEntity.ok(productService.update(id, request, CurrentUser.get()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable UUID id) {
        productService.remove(id, CurrentUser.get());
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"", "/query"})
    public ResponseEntity<List<ProductResponse>> findByFilter(
            @RequestParam(required = false) @Size(max = 100) String description,
            @RequestParam(required = false) ProductCategory category,
            @RequestParam(required = false) @Size(max = 100) String vendorCity,
            @RequestParam(required = false) @Size(max = 50) String vendorState
    ) {
        return ResponseEntity.ok(productService.findByFilter(new ProductFilter(description, category, vendorCity, vendorState)));
    }

    @GetMapping("/vendor/{vendorAccountId}")
    public ResponseEntity<List<ProductResponse>> findByVendorAccountId(@PathVariable UUID vendorAccountId) {
        return ResponseEntity.ok(productService.findByVendorAccountId(vendorAccountId, CurrentUser.get()));
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        productService.setAvailable(id, false, CurrentUser.get());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        productService.setAvailable(id, true, CurrentUser.get());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/evaluate")
    public ResponseEntity<ProductResponse> evaluate(@PathVariable UUID id, @Valid @RequestBody ProductEvaluationInput request) {
        return productService.evaluate(id, request, CurrentUser.get())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
