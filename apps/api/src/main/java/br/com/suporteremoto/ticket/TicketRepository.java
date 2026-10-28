package br.com.suporteremoto.ticket;

import br.com.suporteremoto.identity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByCode(String code);
    List<Ticket> findByCustomerOrderByCreatedAtDesc(User customer);
    List<Ticket> findAllByOrderByCreatedAtDesc();
    List<Ticket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
    long countByStatus(TicketStatus status);
}
