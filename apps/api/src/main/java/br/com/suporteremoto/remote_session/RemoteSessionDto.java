package br.com.suporteremoto.remote_session;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class RemoteSessionDto {
    private Long id;
    private Long ticketId;
    private String ticketCode;
    private String ticketTitle;
    private String customerName;
    private Long technicianId;
    private String technicianName;
    private String toolUsed;
    private Instant startedAt;
    private Instant pausedAt;
    private Instant endedAt;
    private String status;
    private Long currentTotalSeconds;
    private Long billableSeconds;
    private boolean customerConsent;
    private String notes;
}
