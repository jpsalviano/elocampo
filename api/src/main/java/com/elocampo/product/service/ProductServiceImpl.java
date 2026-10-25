package com.elocampo.product.service;

import com.elocampo.account.AccountResponse;
import com.elocampo.account.AccountRole;
import com.elocampo.account.service.AccountService;
import com.elocampo.common.UuidV7;
import com.elocampo.common.exceptions.ForbiddenException;
import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.order.service.OrderService;
import com.elocampo.product.ProductEvaluationInput;
import com.elocampo.product.ProductFilter;
import com.elocampo.product.ProductInput;
import com.elocampo.product.ProductResponse;
import com.elocampo.product.ProductStatus;
import com.elocampo.product.entity.Product;
import com.elocampo.product.entity.ProductEvaluation;
import com.elocampo.product.mapper.ProductMapper;
import com.elocampo.product.repository.ProductQueryRepository;
import com.elocampo.product.repository.ProductRepository;
import com.elocampo.security.CurrentUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Validated
@Slf4j
public class ProductServiceImpl implements ProductService {

    static final int MAX_PER_VENDOR = 50;

    private final ProductRepository productRepository;
    private final ProductQueryRepository productQueryRepository;
    private final AccountService accountService;
    private final OrderService orderService;

    public ProductServiceImpl(ProductRepository productRepository, ProductQueryRepository productQueryRepository,
                              AccountService accountService, @Lazy OrderService orderService) {
        this.productRepository = productRepository;
        this.productQueryRepository = productQueryRepository;
        this.accountService = accountService;
        this.orderService = orderService;
    }

    @Override
    public ProductResponse create(ProductInput request, CurrentUser user) {
        var vendor = accountService.requireOwn(user);
        if (vendor.getRole() != AccountRole.VENDOR) {
            throw new ValidationErrorException("account is not a vendor. Only vendor accounts can create products");
        }
        if (productRepository.countByVendorAccountIdAndRemovedFalse(vendor.getId().toString()) >= MAX_PER_VENDOR) {
            throw new ValidationErrorException("No máximo " + MAX_PER_VENDOR + " produtos por produtor");
        }
        var now = Instant.now();
        var productEntity = Product.builder()
                .id(UuidV7.generate().toString())
                .vendorAccountId(vendor.getId().toString())
                .description(request.getDescription())
                .status(ProductStatus.AVAILABLE)
                .category(request.getCategory())
                .scale(request.getScale())
                .quantity(request.getQuantity())
                .price(request.getPrice())
                .vendorCity(vendor.getAddress() != null ? vendor.getAddress().getCity() : null)
                .vendorState(vendor.getAddress() != null ? vendor.getAddress().getState() : null)
                .availabilityDate(Instant.ofEpochMilli(request.getAvailabilityDate()))
                .imageUrls(List.of())
                .removed(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        var productSaved = productRepository.save(productEntity);
        log.info("Product created (id={}, vendor={})", productSaved.getId(), vendor.getId());
        return ProductMapper.toProductResponse(productSaved);
    }

    @Override
    public ProductResponse update(UUID productId, ProductInput request, CurrentUser user) {
        var productEntity = requireOwned(productId, user);
        productEntity.setDescription(request.getDescription());
        productEntity.setCategory(request.getCategory());
        productEntity.setScale(request.getScale());
        productEntity.setQuantity(request.getQuantity());
        productEntity.setPrice(request.getPrice());
        productEntity.setAvailabilityDate(Instant.ofEpochMilli(request.getAvailabilityDate()));
        productEntity.setUpdatedAt(Instant.now());
        var productSaved = productRepository.save(productEntity);
        log.info("Product updated (id={})", productId);
        return ProductMapper.toProductResponse(productSaved);
    }

    // Só quem concluiu um pedido com este produto, uma vez.
    @Override
    public Optional<ProductResponse> evaluate(UUID productId, ProductEvaluationInput request, CurrentUser user) {
        var reviewer = accountService.requireOwn(user);
        var product = productRepository.findByIdAndRemovedFalse(productId.toString())
                .orElseThrow(() -> new NotFoundException("product not found by id"));
        if (!orderService.completedBetween(reviewer.getId(), UUID.fromString(product.getVendorAccountId()), productId)) {
            throw new ValidationErrorException("only after a completed order of this product");
        }
        if (product.getEvaluations() == null) {
            product.setEvaluations(new HashSet<>());
        }
        if (product.getEvaluations().stream().anyMatch(e -> reviewer.getId().equals(e.getReviewAccountId()))) {
            throw new ValidationErrorException("you already evaluated this product");
        }
        product.getEvaluations().add(ProductEvaluation.builder()
                .id(UUID.randomUUID())
                .stars(request.getStars())
                .content(request.getContent())
                .reviewAccountId(reviewer.getId())
                .build());
        productRepository.save(product);
        log.info("Product evaluation created (productId={})", productId);
        return Optional.of(ProductMapper.toProductResponse(product));
    }

    @Override
    public List<ProductResponse> findAll() {
        return productRepository.findAll().stream().map(ProductMapper::toProductResponse).toList();
    }

    @Override
    public Optional<ProductResponse> findById(UUID productId) {
        return productRepository.findByIdAndRemovedFalse(productId.toString()).map(ProductMapper::toProductResponse);
    }

    @Override
    public List<ProductResponse> findByFilter(ProductFilter filter) {
        return productQueryRepository.findByFilter(filter).stream().map(ProductMapper::toProductResponse).toList();
    }

    // O produtor e os admins veem tudo do produtor; os outros, só o que está à venda.
    @Override
    public List<ProductResponse> findByVendorAccountId(UUID vendorAccountId, CurrentUser viewer) {
        var own = viewer.admin() || accountService.findOwn(viewer)
                .map(AccountResponse::getId).filter(vendorAccountId::equals).isPresent();
        return productRepository.findByVendorAccountIdAndRemovedFalse(vendorAccountId.toString())
                .stream()
                .filter(p -> own || p.getStatus() == ProductStatus.AVAILABLE)
                .map(ProductMapper::toProductResponse)
                .toList();
    }

    @Override
    public void setAvailable(UUID productId, boolean available, CurrentUser user) {
        var product = requireOwned(productId, user);
        product.setStatus(available ? ProductStatus.AVAILABLE : ProductStatus.UNAVAILABLE);
        product.setUpdatedAt(Instant.now());
        productRepository.save(product);
        log.info("Product {} (id={})", available ? "available" : "unavailable", productId);
    }

    @Override
    public void remove(UUID productId, CurrentUser user) {
        var product = requireOwned(productId, user);
        product.setRemoved(true);
        product.setUpdatedAt(Instant.now());
        productRepository.save(product);
        log.info("Product removed (id={})", productId);
    }

    private Product requireOwned(UUID productId, CurrentUser user) {
        var product = productRepository.findByIdAndRemovedFalse(productId.toString())
                .orElseThrow(() -> new NotFoundException("product not found by id"));
        if (!user.admin()) {
            var mine = accountService.findOwn(user).map(a -> a.getId().toString()).orElse(null);
            if (!product.getVendorAccountId().equals(mine)) {
                throw new ForbiddenException("not your product");
            }
        }
        return product;
    }
}
