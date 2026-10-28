package br.com.suporteremoto.ticket;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class TicketResponseDto {
    private Long id;
    private String code;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private Long technicianId;
    private String technicianName;
    private Long serviceId;
    private String serviceName;
    private String title;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private String remoteAccessTool;
    private String remoteAccessId;
    private BigDecimal estimatedPrice;
    private Instant resolvedAt;
    private Instant closedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
