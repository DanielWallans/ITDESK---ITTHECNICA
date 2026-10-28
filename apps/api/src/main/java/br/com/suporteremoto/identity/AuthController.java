package br.com.suporteremoto.identity;

import br.com.suporteremoto.shared.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints de autenticação, cadastro e sessão do usuário")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Efetua login e retorna token JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login realizado com sucesso", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Realiza cadastro inicial do cliente")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.ok("Cadastro realizado com sucesso", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Retorna os dados do usuário autenticado")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser() {
        UserDto userDto = authService.getCurrentUserDto();
        return ResponseEntity.ok(ApiResponse.ok(userDto));
    }
}
