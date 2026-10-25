package com.elocampo.order.service;

import com.elocampo.account.AccountResponse;
import com.elocampo.account.AccountRole;
import com.elocampo.account.service.AccountService;
import com.elocampo.common.exceptions.ForbiddenException;
import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.order.OrderHistoryType;
import com.elocampo.order.OrderInput;
import com.elocampo.order.OrderResponse;
import com.elocampo.order.OrderStatus;
import com.elocampo.order.OrderStatusChangeInput;
import com.elocampo.order.entity.Order;
import com.elocampo.order.entity.OrderHistory;
import com.elocampo.order.entity.OrderItemEmbedded;
import com.elocampo.order.mapper.OrderMapper;
import com.elocampo.order.repository.OrderRepository;
import com.elocampo.product.ProductResponse;
import com.elocampo.product.ProductStatus;
import com.elocampo.product.service.ProductService;
import com.elocampo.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Validated
@Slf4j
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    static final int MAX_PER_DAY = 30;

    private final OrderRepository orderRepository;
    private final AccountService accountService;
    private final ProductService productService;

    // O cliente diz quais produtos e quanto; descrição, preço e vendedor vêm
    // dos próprios produtos.
    @Override
    public OrderResponse create(OrderInput request, CurrentUser user) {
        var buyer = accountService.requireOwn(user);
        if (buyer.getRole() != AccountRole.BUYER) {
            throw new ValidationErrorException("account is not a customer. Only costumers account can create new orders");
        }
        var dayAgo = Instant.now().minus(java.time.Duration.ofDays(1));
        if (orderRepository.countByBuyerAccountIdAndCreatedAtAfter(buyer.getId().toString(), dayAgo) >= MAX_PER_DAY) {
            throw new ValidationErrorException("No máximo " + MAX_PER_DAY + " pedidos por dia");
        }
        var items = new LinkedHashSet<OrderItemEmbedded>();
        var seen = new HashSet<UUID>();
        String sellerId = null;
        for (var item : request.getProductsIds()) {
            if (!seen.add(item.getProductId())) {
                throw new ValidationErrorException("each product can appear only once in an order");
            }
            ProductResponse product = productService.findById(item.getProductId())
                    .filter(p -> p.getStatus() == ProductStatus.AVAILABLE)
                    .orElseThrow(() -> new ValidationErrorException("product not available: " + item.getProductId()));
            if (sellerId == null) {
                sellerId = product.getVendorAccountId().toString();
            } else if (!sellerId.equals(product.getVendorAccountId().toString())) {
                throw new ValidationErrorException("all products of an order must come from the same vendor");
            }
            if (item.getQuantity().compareTo(BigDecimal.valueOf(product.getQuantity())) > 0) {
                throw new ValidationErrorException("quantity above what is available for " + product.getDescription());
            }
            items.add(new OrderItemEmbedded(product.getId().toString(), product.getDescription(), item.getQuantity(), product.getPrice()));
        }
        var totalPrice = items.stream()
                .map(item -> item.getPrice().multiply(item.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var now = Instant.now();
        var orderEntity = Order.builder()
                .id(UUID.randomUUID().toString())
                .buyerAccountId(buyer.getId().toString())
                .sellerAccountId(sellerId)
                .status(OrderStatus.PENDING)
                .products(items)
                .price(totalPrice)
                .createdAt(now)
                .updatedAt(now)
                .build();
        var saved = orderRepository.save(orderEntity);
        log.info("Order created (id={}, buyer={}, seller={})", saved.getId(), saved.getBuyerAccountId(), sellerId);
        return OrderMapper.toOrderResponse(saved);
    }

    @Override
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream().map(OrderMapper::toOrderResponse).toList();
    }

    @Override
    public Optional<OrderResponse> findById(UUID id, CurrentUser viewer) {
        var order = orderRepository.findById(id.toString());
        order.ifPresent(o -> requireParty(o, viewer));
        return order.map(OrderMapper::toOrderResponse);
    }

    // O vendedor anda com o pedido (aceitar, concluir, cancelar); o comprador
    // só pode cancelar enquanto está pendente.
    @Override
    public void changeStatus(UUID orderId, OrderStatusChangeInput input, CurrentUser user) {
        var order = orderRepository.findById(orderId.toString())
                .orElseThrow(() -> new NotFoundException("order not found by id"));
        var mine = requireParty(order, user);
        var isSeller = mine != null && mine.equals(order.getSellerAccountId());
        if (!user.admin() && !isSeller
                && !(input.getStatus() == OrderStatus.CANCELLED && order.getStatus() == OrderStatus.PENDING)) {
            throw new ForbiddenException("the buyer can only cancel a pending order");
        }
        validateStatusChange(input, order);
        if (order.getHistory() == null) {
            order.setHistory(new HashSet<>());
        }
        var now = Instant.now();
        var history = new OrderHistory();
        history.setId(UUID.randomUUID().toString());
        history.setStatus(input.getStatus());
        history.setType(OrderHistoryType.STATUS_CHANGE);
        history.setNote(input.getNote());
        history.setCreatedAt(now);
        order.setStatus(input.getStatus());
        order.getHistory().add(history);
        order.setUpdatedAt(now);
        orderRepository.save(order);
        log.info("Order status changed (id={}, status={})", orderId, input.getStatus());
    }

    @Override
    public Page<OrderResponse> findByBuyerAccountId(UUID buyerAccountId, Pageable pageable, CurrentUser viewer) {
        requireOwnAccount(buyerAccountId, viewer);
        return orderRepository.findByBuyerAccountId(buyerAccountId.toString(), pageable).map(OrderMapper::toOrderResponse);
    }

    @Override
    public Page<OrderResponse> findBySellerAccountId(UUID sellerAccountId, Pageable pageable, CurrentUser viewer) {
        requireOwnAccount(sellerAccountId, viewer);
        return orderRepository.findBySellerAccountId(sellerAccountId.toString(), pageable).map(OrderMapper::toOrderResponse);
    }

    @Override
    public boolean completedBetween(UUID accountId, UUID otherAccountId, UUID productId) {
        return orderRepository.existsCompleted(accountId.toString(), otherAccountId.toString(), productId.toString());
    }

    private void validateStatusChange(OrderStatusChangeInput input, Order order) {
        if (OrderStatus.COMPLETED.equals(order.getStatus())) {
            throw new ValidationErrorException("Cannot change status from COMPLETED to COMPLETED");
        }
        var allowedNextStatus = OrderStatus.validStatusToChange(order.getStatus());
        if (!allowedNextStatus.contains(input.getStatus())) {
            throw new ValidationErrorException(String.format("Cannot change status to %s. Valid next status: %s", input.getStatus(), allowedNextStatus));
        }
    }

    // A conta de quem chama, se for o comprador ou o vendedor; null para um admin
    // que não é nenhum dos dois; senão, proibido.
    private String requireParty(Order order, CurrentUser user) {
        var mine = accountService.findOwn(user).map(AccountResponse::getId).map(UUID::toString).orElse(null);
        if (mine != null && (mine.equals(order.getBuyerAccountId()) || mine.equals(order.getSellerAccountId()))) {
            return mine;
        }
        if (user.admin()) return null;
        throw new ForbiddenException("not your order");
    }

    private void requireOwnAccount(UUID accountId, CurrentUser viewer) {
        if (viewer.admin()) return;
        var mine = accountService.findOwn(viewer).map(AccountResponse::getId).orElse(null);
        if (!accountId.equals(mine)) {
            throw new ForbiddenException("not your account");
        }
    }
}
