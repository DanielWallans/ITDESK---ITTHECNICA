package br.com.suporteremoto.ticket;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTicketRequest {
    private Long serviceId;

    @NotBlank(message = "Título do chamado é obrigatório")
    private String title;

    @NotBlank(message = "Descrição detalhada do problema é obrigatória")
    private String description;

    private TicketPriority priority = TicketPriority.MEDIUM;
    private String remoteAccessTool = "ANYDESK";
    private String remoteAccessId;
}
