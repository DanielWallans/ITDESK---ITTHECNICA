package br.com.suporteremoto.ticket;

import br.com.suporteremoto.catalog.ServiceRepository;
import br.com.suporteremoto.identity.AuthService;
import br.com.suporteremoto.identity.Role;
import br.com.suporteremoto.identity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketMessageRepository messageRepository;

    @Mock
    private ServiceRepository serviceRepository;

    @Mock
    private AuthService authService;

    @InjectMocks
    private TicketService ticketService;

    private User customer1;
    private User customer2;
    private User technician;
    private Ticket ticketCustomer1;

    @BeforeEach
    void setUp() {
        customer1 = User.builder().id(10L).fullName("Cliente 1").email("c1@email.com").role(Role.CUSTOMER).build();
        customer2 = User.builder().id(20L).fullName("Cliente 2").email("c2@email.com").role(Role.CUSTOMER).build();
        technician = User.builder().id(30L).fullName("Tecnico").email("tech@email.com").role(Role.TECHNICIAN).build();

        ticketCustomer1 = Ticket.builder()
                .id(100L)
                .code("CH-2026-000100")
                .customer(customer1)
                .title("Problema no certificado")
                .description("Descrição do problema")
                .status(TicketStatus.NEW)
                .priority(TicketPriority.HIGH)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Cenário Crítico 1: Cliente 2 NÃO PODE acessar o chamado do Cliente 1")
    void shouldDenyAccessWhenCustomerAttemptsToViewAnotherCustomerTicket() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticketCustomer1));
        when(authService.getCurrentAuthenticatedUser()).thenReturn(customer2);

        assertThrows(AccessDeniedException.class, () -> ticketService.getTicketById(100L));
    }

    @Test
    @DisplayName("Cenário Crítico 2: Cliente NUNCA pode receber notas internas")
    void shouldNeverReturnInternalNotesToCustomer() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticketCustomer1));
        when(authService.getCurrentAuthenticatedUser()).thenReturn(customer1);

        TicketMessage publicMsg = TicketMessage.builder()
                .id(1L)
                .ticket(ticketCustomer1)
                .author(technician)
                .message("Mensagem pública para o cliente")
                .internal(false)
                .createdAt(Instant.now())
                .build();

        when(messageRepository.findByTicketIdAndInternalFalseOrderByCreatedAtAsc(100L))
                .thenReturn(List.of(publicMsg));

        List<TicketMessageDto> messages = ticketService.getMessages(100L);

        assertEquals(1, messages.size());
        assertFalse(messages.get(0).isInternal());
        verify(messageRepository, times(1)).findByTicketIdAndInternalFalseOrderByCreatedAtAsc(100L);
        verify(messageRepository, never()).findByTicketIdOrderByCreatedAtAsc(100L);
    }

    @Test
    @DisplayName("Cenário Crítico 3: Técnico PODE visualizar notas internas")
    void shouldReturnInternalNotesToTechnician() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticketCustomer1));
        when(authService.getCurrentAuthenticatedUser()).thenReturn(technician);

        TicketMessage internalMsg = TicketMessage.builder()
                .id(2L)
                .ticket(ticketCustomer1)
                .author(technician)
                .message("Nota confidencial interna do técnico")
                .internal(true)
                .createdAt(Instant.now())
                .build();

        when(messageRepository.findByTicketIdOrderByCreatedAtAsc(100L))
                .thenReturn(List.of(internalMsg));

        List<TicketMessageDto> messages = ticketService.getMessages(100L);

        assertEquals(1, messages.size());
        assertTrue(messages.get(0).isInternal());
        verify(messageRepository, times(1)).findByTicketIdOrderByCreatedAtAsc(100L);
    }
}
