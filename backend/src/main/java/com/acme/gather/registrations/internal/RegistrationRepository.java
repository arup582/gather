package com.acme.gather.registrations.internal;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface RegistrationRepository extends JpaRepository<Registration, UUID> {
  Optional<Registration> findByEventIdAndAttendeeIdAndStatus(
      UUID event, UUID attendee, String status);

  Page<Registration> findByAttendeeIdOrderByRegisteredAtDescId(UUID attendee, Pageable page);

  Page<Registration> findByEventIdOrderByRegisteredAtDescId(UUID event, Pageable page);

  @Query("select r.eventId from Registration r where r.id=:id")
  Optional<UUID> eventId(UUID id);

  @Modifying(flushAutomatically = true)
  @Query(
      "update Registration r set"
          + " r.status='CANCELLED',r.cancelledAt=:at,r.cancellationReason='EVENT_CANCELLED' where"
          + " r.eventId=:id and r.status='ACTIVE'")
  int cancelEvent(UUID id, Instant at);
}
