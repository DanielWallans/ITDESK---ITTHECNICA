package br.com.suporteremoto.remote_session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RemoteSessionRepository extends JpaRepository<RemoteSession, Long> {
    List<RemoteSession> findByTicketIdOrderByStartedAtDesc(Long ticketId);
    Optional<RemoteSession> findFirstByTechnicianIdAndStatusIn(Long technicianId, List<String> statuses);
    Optional<RemoteSession> findFirstByTicketIdAndStatusIn(Long ticketId, List<String> statuses);
    List<RemoteSession> findByStatusIn(List<String> statuses);
}
