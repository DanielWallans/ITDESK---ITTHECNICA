package br.com.suporteremoto.catalog;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ServiceDto {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private String billingModel;
    private BigDecimal referencePrice;
    private Integer estimatedMinutes;
    private String instructionsForCustomer;
    private boolean active;
}
