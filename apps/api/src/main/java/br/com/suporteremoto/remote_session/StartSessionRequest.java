package br.com.suporteremoto.remote_session;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartSessionRequest {
    @NotNull(message = "ID do chamado é obrigatório")
    private Long ticketId;
    private String toolUsed = "ANYDESK";
    private boolean customerConsent = true;
    private String notes;
}
