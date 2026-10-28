package br.com.suporteremoto.catalog;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "services")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ServiceCategory category;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "billing_model", nullable = false)
    private String billingModel; // FIXED, HOURLY, SUBSCRIPTION

    @Column(name = "reference_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal referencePrice;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "instructions_for_customer", columnDefinition = "TEXT")
    private String instructionsForCustomer;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
