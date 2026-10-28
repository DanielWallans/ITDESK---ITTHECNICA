package br.com.suporteremoto.identity;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("E-mail já cadastrado no sistema");
        }

        // Regra de segurança: cadastro público SEMPRE cria CUSTOMER
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(Role.CUSTOMER)
                .active(true)
                .emailVerified(true)
                .build();

        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(mapToDto(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (!user.isActive()) {
            throw new IllegalStateException("Esta conta foi desativada. Entre em contato com o suporte.");
        }

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(mapToDto(user))
                .build();
    }

    public User getCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() instanceof String) {
            throw new IllegalStateException("Usuário não autenticado");
        }
        return (User) auth.getPrincipal();
    }

    public UserDto getCurrentUserDto() {
        return mapToDto(getCurrentAuthenticatedUser());
    }

    public UserDto mapToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .companyId(user.getCompanyId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .active(user.isActive())
                .build();
    }
}
