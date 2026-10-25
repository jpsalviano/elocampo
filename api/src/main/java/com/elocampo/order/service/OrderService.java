package com.elocampo.order.service;

import com.elocampo.order.OrderInput;
import com.elocampo.order.OrderResponse;
import com.elocampo.order.OrderStatusChangeInput;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderService {

    OrderResponse create(@Valid OrderInput request, CurrentUser user);

    List<OrderResponse> findAll();

    Optional<OrderResponse> findById(UUID id, CurrentUser viewer);

    void changeStatus(UUID orderId, @Valid OrderStatusChangeInput input, CurrentUser user);

    Page<OrderResponse> findByBuyerAccountId(UUID buyerAccountId, Pageable pageable, CurrentUser viewer);

    Page<OrderResponse> findBySellerAccountId(UUID sellerAccountId, Pageable pageable, CurrentUser viewer);

    // Se as duas contas concluíram um pedido com este produto (qualquer uma
    // comprando): a condição para avaliar.
    boolean completedBetween(UUID accountId, UUID otherAccountId, UUID productId);
}
