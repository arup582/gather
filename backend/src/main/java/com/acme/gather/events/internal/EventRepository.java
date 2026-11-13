package com.acme.gather.events.internal;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface EventRepository extends JpaRepository<Event, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from Event e where e.id=:id")
  Optional<Event> lock(UUID id);

  @Query(
      "select e from Event e where e.status=com.acme.gather.events.EventStatus.PUBLISHED and"
          + " e.startsAt>:now and (lower(e.title) like :q escape '!' or lower(e.venue) like :q"
          + " escape '!') order by e.startsAt,e.id")
  Page<Event> browse(Instant now, String q, Pageable page);

  @Query(
      "select e from Event e where (:all=true or e.organizerId=:owner) order by e.startsAt"
          + " desc,e.id")
  Page<Event> managed(UUID owner, boolean all, Pageable page);
}
