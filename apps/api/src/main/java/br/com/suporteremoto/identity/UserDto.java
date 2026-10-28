package br.com.suporteremoto.identity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDto {
    private Long id;
    private Long companyId;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private boolean active;
}
