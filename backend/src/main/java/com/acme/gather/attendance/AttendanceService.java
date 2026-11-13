package com.acme.gather.attendance;

import com.acme.gather.attendance.internal.*;
import com.acme.gather.events.*;
import com.acme.gather.identity.Actor;
import com.acme.gather.registrations.RegistrationService;
import com.acme.gather.shared.ApiException;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AttendanceService {
  private final AttendanceRepository attendance;
  private final EventService events;
  private final RegistrationService registrations;
  private final Clock clock;

  public AttendanceService(
      AttendanceRepository attendance,
      EventService events,
      RegistrationService registrations,
      Clock clock) {
    this.attendance = attendance;
    this.events = events;
    this.registrations = registrations;
    this.clock = clock;
  }

  public AttendanceView checkIn(Actor actor, UUID eventId, UUID registrationId) {
    var event = events.lock(eventId);
    events.requireOwner(event, actor);
    registrations.requireActive(eventId, registrationId);
    // A repeat returns the original immutable record, even if the event has since ended.
    var existing = attendance.findByRegistrationId(registrationId);
    if (existing.isPresent()) return existing.get().view();
    var now = clock.instant();
    if (event.status() != EventStatus.PUBLISHED
        || now.isBefore(event.startsAt())
        || !now.isBefore(event.endsAt()))
      throw ApiException.conflict(
          "Check-in is available only while a published event is in progress");
    return attendance.save(new Attendance(registrationId, actor.id(), now)).view();
  }

  @Transactional(readOnly = true)
  public List<AttendanceView> list(Actor actor, UUID eventId) {
    events.requireOwner(events.get(eventId, actor), actor);
    return attendance.forEvent(eventId).stream().map(Attendance::view).toList();
  }
}
