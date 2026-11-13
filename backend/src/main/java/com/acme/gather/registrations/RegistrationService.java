package com.acme.gather.registrations;

import com.acme.gather.events.*;
import com.acme.gather.identity.*;
import com.acme.gather.registrations.internal.*;
import com.acme.gather.shared.*;
import java.time.Clock;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class RegistrationService {
  private final RegistrationRepository registrations;
  private final EventService events;
  private final IdentityService identity;
  private final Clock clock;

  public RegistrationService(
      RegistrationRepository registrations,
      EventService events,
      IdentityService identity,
      Clock clock) {
    this.registrations = registrations;
    this.events = events;
    this.identity = identity;
    this.clock = clock;
  }

  private RegistrationView view(Registration r, Actor viewer) {
    var user = identity.byId(r.attendeeId);
    return new RegistrationView(
        r.id,
        events.get(r.eventId, viewer),
        r.attendeeId,
        user.displayName(),
        user.email(),
        r.status,
        r.registeredAt,
        r.cancelledAt,
        r.cancellationReason);
  }

  public RegistrationView register(Actor actor, UUID eventId) {
    var e = events.lock(eventId);
    if (e.status() != EventStatus.PUBLISHED || !e.startsAt().isAfter(clock.instant()))
      throw ApiException.conflict("Registration requires a published event that has not started");
    var r =
        registrations
            .findByEventIdAndAttendeeIdAndStatus(eventId, actor.id(), "ACTIVE")
            .orElseGet(
                () -> registrations.save(new Registration(eventId, actor.id(), clock.instant())));
    return view(r, actor);
  }

  public RegistrationView cancel(Actor actor, UUID id) {
    var eventId = registrations.eventId(id).orElseThrow(ApiException::notFound);
    var e = events.lock(eventId);
    var r = registrations.findById(id).orElseThrow(ApiException::notFound);
    if (!r.attendeeId.equals(actor.id())) throw ApiException.notFound();
    if (r.status.equals("CANCELLED")) return view(r, actor);
    if (!e.startsAt().isAfter(clock.instant()))
      throw ApiException.conflict("Registration cannot be cancelled after the event starts");
    r.cancel(clock.instant());
    return view(r, actor);
  }

  @Transactional(readOnly = true)
  public PageResponse<RegistrationView> mine(Actor actor, int page, int size) {
    return PageResponse.of(
        registrations
            .findByAttendeeIdOrderByRegisteredAtDescId(actor.id(), PageResponse.request(page, size))
            .map(r -> view(r, actor)));
  }

  @Transactional(readOnly = true)
  public PageResponse<RegistrationView> attendees(Actor actor, UUID eventId, int page, int size) {
    var e = events.get(eventId, actor);
    events.requireOwner(e, actor);
    return PageResponse.of(
        registrations
            .findByEventIdOrderByRegisteredAtDescId(eventId, PageResponse.request(page, size))
            .map(r -> view(r, actor)));
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void requireActive(UUID eventId, UUID id) {
    var r = registrations.findById(id).orElseThrow(ApiException::notFound);
    if (!r.eventId.equals(eventId)) throw ApiException.notFound();
    if (!r.status.equals("ACTIVE"))
      throw ApiException.conflict("Only active registrations can be checked in");
  }

  @EventListener
  public void onCancelled(EventCancelled event) {
    registrations.cancelEvent(event.eventId(), event.at());
  }
}
