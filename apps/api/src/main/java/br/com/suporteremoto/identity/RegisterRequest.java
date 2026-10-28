package br.com.suporteremoto.identity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Nome completo é obrigatório")
    private String fullName;

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail em formato inválido")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "A senha deve ter no mínimo 6 caracteres")
    private String password;

    private String phone;
    private String companyName;
}
