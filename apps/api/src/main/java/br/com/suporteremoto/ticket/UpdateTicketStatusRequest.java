package br.com.suporteremoto.ticket;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTicketStatusRequest {
    @NotNull(message = "Novo status é obrigatório")
    private TicketStatus status;
    private String reason;
}
