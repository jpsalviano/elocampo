package com.elocampo.account.service;

import com.elocampo.account.AccountEvaluationInput;
import com.elocampo.account.AccountEvaluationResponse;
import com.elocampo.account.AccountInput;
import com.elocampo.account.AccountResponse;
import com.elocampo.account.entity.Account;
import com.elocampo.account.entity.AccountEvaluation;
import com.elocampo.account.mapper.AccountMapper;
import com.elocampo.account.repository.AccountRepository;
import com.elocampo.common.UuidV7;
import com.elocampo.common.exceptions.ForbiddenException;
import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.order.service.OrderService;
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

import static org.apache.commons.lang3.StringUtils.isBlank;

@Service
@Validated
@Slf4j
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final OrderService orderService;

    // Pedidos dependem de contas e avaliações de conta dependem de pedidos: lazy deste lado.
    public AccountServiceImpl(AccountRepository accountRepository, @Lazy OrderService orderService) {
        this.accountRepository = accountRepository;
        this.orderService = orderService;
    }

    @Override
    public AccountResponse create(AccountInput request, CurrentUser user) {
        validateAccountCreation(request, user);
        var now = Instant.now();
        var accountEntity = Account.builder()
                .id(UuidV7.generate().toString())
                .name(request.getName())
                .businessName(request.getBusinessName())
                .userId(user.userId())
                .cpf(blankToNull(request.getCpf()))
                .cnpj(blankToNull(request.getCnpj()))
                .birthdayDate(Instant.ofEpochMilli(request.getBirthdayDate()))
                .address(AccountMapper.toAccountAddress(request.getAddress()))
                .phone(AccountMapper.toAccountPhone(request.getPhone()))
                .role(request.getRole())
                .active(true)
                .removed(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        var accountSaved = accountRepository.save(accountEntity);
        log.info("Account created (id={}, role={})", accountSaved.getId(), accountSaved.getRole());
        return AccountMapper.toAccountResponse(accountSaved);
    }

    // Nome, razão social, endereço e telefone. O papel e os documentos ficam
    // como foram criados.
    @Override
    public AccountResponse update(UUID accountId, AccountInput request, CurrentUser user) {
        var accountEntity = accountRepository.findByIdAndRemovedFalse(accountId.toString())
                .orElseThrow(() -> new NotFoundException("account not found by id"));
        requireOwnerOrAdmin(accountEntity, user);
        accountEntity.setName(request.getName());
        accountEntity.setBusinessName(request.getBusinessName());
        accountEntity.setAddress(AccountMapper.toAccountAddress(request.getAddress()));
        accountEntity.setPhone(AccountMapper.toAccountPhone(request.getPhone()));
        accountEntity.setUpdatedAt(Instant.now());
        var accountSaved = accountRepository.save(accountEntity);
        log.info("Account updated (id={})", accountId);
        return AccountMapper.toAccountResponse(accountSaved);
    }

    @Override
    public Optional<AccountResponse> findById(UUID accountId, CurrentUser viewer) {
        return accountRepository.findByIdAndRemovedFalse(accountId.toString()).map(a -> view(a, viewer));
    }

    @Override
    public List<AccountResponse> findAll() {
        return accountRepository.findAll().stream().map(AccountMapper::toAccountResponse).toList();
    }

    @Override
    public Optional<AccountResponse> findByUserId(UUID userId, CurrentUser viewer) {
        if (!viewer.admin() && !viewer.userId().equals(userId.toString())) {
            throw new ForbiddenException("not your account");
        }
        return accountRepository.findByUserIdAndRemovedFalse(userId.toString()).map(AccountMapper::toAccountResponse);
    }

    @Override
    public void deactivate(UUID accountId) {
        var account = accountRepository.findByIdAndRemovedFalse(accountId.toString())
                .orElseThrow(() -> new NotFoundException("account not found"));
        account.setRemoved(true);
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
        log.info("Account deactivated (id={})", accountId);
    }

    @Override
    public void activate(UUID accountId) {
        var account = accountRepository.findById(accountId.toString())
                .orElseThrow(() -> new NotFoundException("account not found"));
        if (!account.getRemoved()) {
            throw new ValidationErrorException("account already active. Cannot activate an active account");
        }
        account.setRemoved(false);
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
        log.info("Account activated (id={})", accountId);
    }

    // Só quem concluiu um pedido daquele produto com esta conta, uma vez por
    // produto, e nunca a própria conta.
    @Override
    public Optional<AccountResponse> evaluate(UUID accountId, AccountEvaluationInput request, CurrentUser user) {
        var reviewer = requireOwn(user);
        var account = accountRepository.findByIdAndRemovedFalse(accountId.toString())
                .orElseThrow(() -> new NotFoundException("account not found by id"));
        if (account.getId().equals(reviewer.getId().toString())) {
            throw new ValidationErrorException("cannot evaluate your own account");
        }
        if (!orderService.completedBetween(reviewer.getId(), accountId, request.getProductId())) {
            throw new ValidationErrorException("only after a completed order of this product with this account");
        }
        if (account.getEvaluation() == null) {
            account.setEvaluation(new HashSet<>());
        }
        var already = account.getEvaluation().stream().anyMatch(e ->
                reviewer.getId().equals(e.getReviewAccountId()) && request.getProductId().equals(e.getProductId()));
        if (already) {
            throw new ValidationErrorException("you already evaluated this account for this product");
        }
        account.getEvaluation().add(AccountEvaluation.builder()
                .id(UUID.randomUUID())
                .stars(request.getStars())
                .content(request.getContent())
                .productId(request.getProductId())
                .reviewAccountId(reviewer.getId())
                .build());
        accountRepository.save(account);
        log.info("Account evaluation created (accountId={})", accountId);
        return Optional.of(view(account, user));
    }

    @Override
    public List<AccountEvaluationResponse> evaluations(UUID accountId) {
        var account = accountRepository.findByIdAndRemovedFalse(accountId.toString())
                .orElseThrow(() -> new NotFoundException("account not found by id"));
        if (account.getEvaluation() == null) return List.of();
        return account.getEvaluation().stream().map(AccountMapper::toAccountEvaluationResponse).toList();
    }

    @Override
    public Optional<AccountResponse> findOwn(CurrentUser user) {
        return accountRepository.findByUserIdAndRemovedFalse(user.userId()).map(AccountMapper::toAccountResponse);
    }

    @Override
    public AccountResponse requireOwn(CurrentUser user) {
        return findOwn(user).orElseThrow(() -> new ValidationErrorException("create your account first"));
    }

    @Override
    public Optional<AccountResponse> findActive(UUID accountId) {
        return accountRepository.findByIdAndRemovedFalse(accountId.toString()).map(AccountMapper::toAccountResponse);
    }

    private AccountResponse view(Account account, CurrentUser viewer) {
        return viewer.admin() || account.getUserId().equals(viewer.userId())
                ? AccountMapper.toAccountResponse(account)
                : AccountMapper.toPublicAccountResponse(account);
    }

    private static void requireOwnerOrAdmin(Account account, CurrentUser user) {
        if (!user.admin() && !account.getUserId().equals(user.userId())) {
            throw new ForbiddenException("not your account");
        }
    }

    private void validateAccountCreation(AccountInput request, CurrentUser user) {
        if (isBlank(request.getCpf()) && isBlank(request.getCnpj())) {
            throw new ValidationErrorException("cpf or cnpj is required");
        }
        if (!isBlank(request.getCpf()) && !isBlank(request.getCnpj())) {
            throw new ValidationErrorException("cpf and cnpj are mutually exclusive");
        }
        if (accountRepository.findByUserIdAndRemovedFalse(user.userId()).isPresent()) {
            throw new ValidationErrorException("The user already had an account. Cannot create another one");
        }
        if (!isBlank(request.getCpf()) && accountRepository.findByCpfAndRemovedFalse(request.getCpf()).isPresent()) {
            throw new ValidationErrorException("An account already exists for this cpf");
        }
        if (!isBlank(request.getCnpj()) && accountRepository.findByCnpjAndRemovedFalse(request.getCnpj()).isPresent()) {
            throw new ValidationErrorException("An account already exists for this cnpj");
        }
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
