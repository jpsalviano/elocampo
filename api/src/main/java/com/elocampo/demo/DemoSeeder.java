package com.elocampo.demo;

import com.elocampo.account.AccountRole;
import com.elocampo.account.entity.Account;
import com.elocampo.account.entity.AccountAddress;
import com.elocampo.account.entity.AccountEvaluation;
import com.elocampo.account.entity.AccountPhone;
import com.elocampo.auth.user.entity.User;
import com.elocampo.chat.entity.Chat;
import com.elocampo.chat.entity.Message;
import com.elocampo.common.UuidV7;
import com.elocampo.config.ElocampoProperties;
import com.elocampo.file.FileEntityType;
import com.elocampo.file.entity.FileRecord;
import com.elocampo.file.service.FileService;
import com.elocampo.order.OrderHistoryType;
import com.elocampo.order.OrderStatus;
import com.elocampo.order.entity.Order;
import com.elocampo.order.entity.OrderHistory;
import com.elocampo.order.entity.OrderItemEmbedded;
import com.elocampo.product.ProductCategory;
import com.elocampo.product.ProductScale;
import com.elocampo.product.ProductStatus;
import com.elocampo.product.entity.Product;
import com.elocampo.product.entity.ProductEvaluation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

// A demonstração: produtores, um comprador e um admin de exemplo com uma senha
// só (mostrada na tela de login), com produtos, pedidos em todas as situações,
// avaliações e uma conversa. Tudo, inclusive as contas que as pessoas criarem,
// é apagado e recriado ao subir e todo dia às 4h. Grava as entidades direto,
// como carga de teste, sem passar pelas checagens de permissão dos services.
@Slf4j
@Component
@RequiredArgsConstructor
public class DemoSeeder {

    public static final String VENDOR_EMAIL = "produtor@elocampo.demo";
    public static final String VENDOR2_EMAIL = "horta@elocampo.demo";
    public static final String BUYER_EMAIL = "comprador@elocampo.demo";
    public static final String ADMIN_EMAIL = "admin@elocampo.demo";

    public static final List<Class<?>> COLLECTIONS =
            List.of(User.class, Account.class, Product.class, Order.class, Chat.class, FileRecord.class);

    private final ElocampoProperties properties;
    private final MongoTemplate mongo;
    private final PasswordEncoder passwordEncoder;
    private final FileService fileService;

    @EventListener(ApplicationReadyEvent.class)
    public void onStart() {
        if (properties.demoEnabled()) reset();
    }

    @Scheduled(cron = "${elocampo.demo-reset-cron}", zone = "${elocampo.demo-zone}")
    public void daily() {
        if (properties.demoEnabled()) reset();
    }

    private int productDay;

    public synchronized void reset() {
        productDay = 32;
        COLLECTIONS.forEach(c -> mongo.remove(new Query(), c));
        clearFiles();
        seed();
        log.info("Demo data reset");
    }

    private void clearFiles() {
        var root = Path.of(properties.filesRoot());
        if (!Files.isDirectory(root)) return;
        try (Stream<Path> files = Files.list(root)) {
            files.filter(Files::isRegularFile).forEach(p -> {
                try {
                    Files.delete(p);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void seed() {
        var hash = passwordEncoder.encode(properties.demoPassword());
        var vendorUser = user(VENDOR_EMAIL, hash, false, 40);
        var vendor2User = user(VENDOR2_EMAIL, hash, false, 33);
        var buyerUser = user(BUYER_EMAIL, hash, false, 25);
        user(ADMIN_EMAIL, hash, true, 45);

        var vendor = account(vendorUser, "Sítio Boa Vista", "José Carvalho", AccountRole.VENDOR,
                null, "12.345.678/0001-90", "Montes Claros", "MG");
        var vendor2 = account(vendor2User, "Horta Comunitária Esperança", "Maria Aparecida Souza", AccountRole.VENDOR,
                "111.444.777-35", null, "Janaúba", "MG");
        var buyer = account(buyerUser, "Restaurante Sabor da Terra", "Ana Ribeiro", AccountRole.BUYER,
                null, "98.765.432/0001-10", "Belo Horizonte", "MG");

        var milho = product(vendor, "Milho verde em espiga", ProductCategory.GRAIN, ProductScale.UNIT, 400, "1.20", new Color(0xE8C547));
        var feijao = product(vendor, "Feijão carioca", ProductCategory.GRAIN, ProductScale.KG, 250, "8.90", new Color(0x8B5A2B));
        var queijo = product(vendor, "Queijo minas frescal", ProductCategory.DAIRY, ProductScale.KG, 40, "38.00", new Color(0xF3E9C6));
        var ovos = product(vendor, "Ovos caipira (dúzia)", ProductCategory.ANIMAL_PRODUCTS, ProductScale.UNIT, 60, "14.00", new Color(0xD9A066));
        var doce = product(vendor, "Doce de leite caseiro", ProductCategory.CONFECTIONERY, ProductScale.UNIT, 30, "18.50", new Color(0xA0522D));
        var alface = product(vendor2, "Alface crespa orgânica", ProductCategory.VEGETABLE, ProductScale.UNIT, 120, "3.50", new Color(0x6DBF74));
        var tomate = product(vendor2, "Tomate italiano", ProductCategory.VEGETABLE, ProductScale.KG, 90, "7.80", new Color(0xD64933));
        var manga = product(vendor2, "Manga palmer", ProductCategory.FRUIT, ProductScale.KG, 150, "6.50", new Color(0xF4A259));
        var banana = product(vendor2, "Banana prata", ProductCategory.FRUIT, ProductScale.KG, 0, "5.20", new Color(0xF6D55C));
        banana.setStatus(ProductStatus.UNAVAILABLE);
        mongo.save(banana);

        var now = Instant.now();
        order(buyer, vendor, OrderStatus.COMPLETED, now.minus(Duration.ofDays(12)),
                List.of(item(feijao, "20"), item(milho, "100")), "Entregue na quinta-feira, tudo certo.");
        order(buyer, vendor2, OrderStatus.COMPLETED, now.minus(Duration.ofDays(9)),
                List.of(item(alface, "30"), item(tomate, "15")), "Entrega feita no restaurante.");
        order(buyer, vendor, OrderStatus.ACCEPTED, now.minus(Duration.ofDays(2)),
                List.of(item(queijo, "5"), item(ovos, "10")), "Separando para entrega no sábado.");
        order(buyer, vendor2, OrderStatus.PENDING, now.minus(Duration.ofHours(5)),
                List.of(item(manga, "25")), null);
        order(buyer, vendor, OrderStatus.CANCELLED, now.minus(Duration.ofDays(20)),
                List.of(item(doce, "12")), "Cancelado a pedido do comprador.");

        review(feijao, buyer, 5, "Feijão novinho, cozinha rápido.");
        review(alface, buyer, 4, "Muito fresca, chegou bem embalada.");
        reviewAccount(vendor, buyer, feijao, 5, "Entrega pontual e bom atendimento.");
        reviewAccount(buyer, vendor, feijao, 5, "Pagamento em dia, recomendo.");

        chat(buyer, vendor, now.minus(Duration.ofDays(3)), List.of(
                new Object[]{buyer, "Bom dia! Vocês conseguem entregar queijo toda semana?"},
                new Object[]{vendor, "Bom dia, Ana! Conseguimos sim, às sextas-feiras."},
                new Object[]{buyer, "Ótimo, vou fazer o pedido de 5 kg."}));
    }

    private User user(String email, String hash, boolean admin, int daysAgo) {
        var now = Instant.now().minus(Duration.ofDays(daysAgo));
        return mongo.save(User.builder()
                .id(UuidV7.generate().toString())
                .email(email)
                .password(hash)
                .admin(admin)
                .removed(false)
                .createdAt(now.toEpochMilli())
                .updatedAt(now.toEpochMilli())
                .build());
    }

    private Account account(User user, String businessName, String name, AccountRole role,
                            String cpf, String cnpj, String city, String state) {
        var created = Instant.ofEpochMilli(user.getCreatedAt());
        var address = new AccountAddress();
        address.setStreet("Rua das Flores");
        address.setNumber("100");
        address.setDistrict("Centro");
        address.setCity(city);
        address.setState(state);
        address.setComplement("");
        address.setPostalCode("39400-000");
        var phone = new AccountPhone();
        phone.setCountryCode(55);
        phone.setStateCode(38);
        phone.setNumber("99999-0000");
        return mongo.save(Account.builder()
                .id(UuidV7.generate().toString())
                .userId(user.getId())
                .name(name)
                .businessName(businessName)
                .cpf(cpf)
                .cnpj(cnpj)
                .birthdayDate(LocalDate.of(1985, 6, 15).atStartOfDay().toInstant(ZoneOffset.UTC))
                .address(address)
                .phone(phone)
                .role(role)
                .active(true)
                .removed(false)
                .createdAt(created)
                .updatedAt(created)
                .build());
    }

    private Product product(Account vendor, String description, ProductCategory category, ProductScale scale,
                            long quantity, String price, Color color) {
        // Cadastrados ao longo das últimas semanas, para os gráficos do admin.
        productDay -= 3;
        var now = Instant.now().minus(Duration.ofDays(Math.max(productDay, 1)));
        var product = mongo.save(Product.builder()
                .id(UuidV7.generate().toString())
                .vendorAccountId(vendor.getId())
                .description(description)
                .status(ProductStatus.AVAILABLE)
                .category(category)
                .scale(scale)
                .quantity(quantity)
                .price(new BigDecimal(price))
                .vendorCity(vendor.getAddress().getCity())
                .vendorState(vendor.getAddress().getState())
                .availabilityDate(now)
                .imageUrls(List.of())
                .removed(false)
                .createdAt(now)
                .updatedAt(now)
                .build());
        fileService.store(image(color), FileEntityType.PRODUCT, product.getId(), vendor.getUserId());
        return product;
    }

    private static OrderItemEmbedded item(Product product, String quantity) {
        return new OrderItemEmbedded(product.getId(), product.getDescription(), new BigDecimal(quantity), product.getPrice());
    }

    private void order(Account buyer, Account seller, OrderStatus status, Instant at, List<OrderItemEmbedded> items, String note) {
        var history = new java.util.HashSet<OrderHistory>();
        if (status != OrderStatus.PENDING) {
            var h = new OrderHistory();
            h.setId(UUID.randomUUID().toString());
            h.setType(OrderHistoryType.STATUS_CHANGE);
            h.setStatus(status);
            h.setNote(note);
            h.setCreatedAt(at.plus(Duration.ofHours(6)));
            history.add(h);
        }
        mongo.save(Order.builder()
                .id(UUID.randomUUID().toString())
                .buyerAccountId(buyer.getId())
                .sellerAccountId(seller.getId())
                .status(status)
                .products(new java.util.LinkedHashSet<>(items))
                .history(history)
                .price(items.stream().map(i -> i.getPrice().multiply(i.getQuantity())).reduce(BigDecimal.ZERO, BigDecimal::add))
                .createdAt(at)
                .updatedAt(at)
                .build());
    }

    private void review(Product product, Account reviewer, int stars, String content) {
        product.setEvaluations(Set.of(ProductEvaluation.builder()
                .id(UUID.randomUUID()).stars(stars).content(content)
                .reviewAccountId(UUID.fromString(reviewer.getId())).build()));
        mongo.save(product);
    }

    private void reviewAccount(Account account, Account reviewer, Product product, int stars, String content) {
        account.setEvaluation(new java.util.HashSet<>(Set.of(AccountEvaluation.builder()
                .id(UUID.randomUUID()).stars(stars).content(content)
                .reviewAccountId(UUID.fromString(reviewer.getId()))
                .productId(UUID.fromString(product.getId())).build())));
        mongo.save(account);
    }

    private void chat(Account a, Account b, Instant start, List<Object[]> lines) {
        var messages = new java.util.HashSet<Message>();
        var at = start;
        for (var line : lines) {
            at = at.plus(Duration.ofMinutes(7));
            messages.add(Message.builder()
                    .id(UuidV7.generate().toString())
                    .senderAccountId(((Account) line[0]).getId())
                    .content((String) line[1])
                    .createdAt(at)
                    .updatedAt(at)
                    .build());
        }
        mongo.save(Chat.builder()
                .id(UuidV7.generate().toString())
                .senderAccountId(a.getId())
                .receiverAccountId(b.getId())
                .messages(messages)
                .removed(false)
                .createdAt(start)
                .updatedAt(at)
                .build());
    }

    // Uma ilustração simples (sem texto, para não depender de fontes na imagem):
    // um degradê na cor do produto com um círculo mais claro.
    static byte[] image(Color color) {
        var size = 480;
        var img = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setPaint(new GradientPaint(0, 0, color.brighter(), size, size, color.darker()));
        g.fillRect(0, 0, size, size);
        g.setColor(new Color(255, 255, 255, 70));
        g.fillOval(size / 4, size / 4, size / 2, size / 2);
        g.dispose();
        var out = new ByteArrayOutputStream();
        try {
            ImageIO.write(img, "png", out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
