package br.com.suporteremoto.ticket;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {
    // Para técnicos e administradores: todas as mensagens, incluindo notas internas
    List<TicketMessage> findByTicketIdOrderByCreatedAtAsc(Long ticketId);

    // Para clientes: apenas mensagens públicas (is_internal = false)
    List<TicketMessage> findByTicketIdAndInternalFalseOrderByCreatedAtAsc(Long ticketId);
}
