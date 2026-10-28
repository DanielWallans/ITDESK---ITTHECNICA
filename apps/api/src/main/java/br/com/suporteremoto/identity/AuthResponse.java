package br.com.suporteremoto.identity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String type;
    private UserDto user;
}
