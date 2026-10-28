package br.com.suporteremoto.ticket;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateMessageRequest {
    @NotBlank(message = "Mensagem não pode ser vazia")
    private String message;
    private boolean internal = false;
    private String attachmentName;
    private String attachmentPath;
}
