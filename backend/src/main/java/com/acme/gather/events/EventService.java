package com.acme.gather.events;

import com.acme.gather.events.internal.*;
import com.acme.gather.identity.*;
import com.acme.gather.shared.*;
import java.time.Clock;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class EventService {
  private final EventRepository events;
  private final IdentityService identity;
  private final Clock clock;
  private final ApplicationEventPublisher publisher;

  public EventService(
      EventRepository events,
      IdentityService identity,
      Clock clock,
      ApplicationEventPublisher publisher) {
    this.events = events;
    this.identity = identity;
    this.clock = clock;
    this.publisher = publisher;
  }

  private EventView view(Event e) {
    return e.view(identity.byId(e.organizerId).displayName());
  }

  @Transactional(readOnly = true)
  public PageResponse<EventView> browse(String q, int page, int size) {
    if (q.length() > 200)
      throw new ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Search is limited to 200 characters");
    var escaped =
        q.trim().toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
    return PageResponse.of(
        events
            .browse(clock.instant(), "%" + escaped + "%", PageResponse.request(page, size))
            .map(this::view));
  }

  @Transactional(readOnly = true)
  public EventView get(UUID id, Actor actor) {
    var e = events.findById(id).orElseThrow(ApiException::notFound);
    if (e.publishedAt == null) {
      if (actor == null) throw ApiException.notFound();
      requireOwner(e.view(""), actor);
    }
    return view(e);
  }

  @Transactional(readOnly = true)
  public PageResponse<EventView> managed(Actor actor, int page, int size) {
    actor.requireManager();
    return PageResponse.of(
        events
            .managed(actor.id(), actor.admin(), PageResponse.request(page, size))
            .map(this::view));
  }

  public EventView create(Actor actor, EventInput input) {
    actor.requireManager();
    return view(events.save(new Event(actor.id(), input, clock.instant())));
  }

  public EventView edit(Actor actor, UUID id, EventInput input) {
    var e = events.lock(id).orElseThrow(ApiException::notFound);
    requireOwner(e.view(""), actor);
    e.edit(input, clock.instant());
    return view(e);
  }

  public EventView publish(Actor actor, UUID id) {
    var e = events.lock(id).orElseThrow(ApiException::notFound);
    requireOwner(e.view(""), actor);
    e.publish(clock.instant());
    return view(e);
  }

  public EventView cancel(Actor actor, UUID id) {
    var e = events.lock(id).orElseThrow(ApiException::notFound);
    requireOwner(e.view(""), actor);
    if (e.cancel()) publisher.publishEvent(new EventCancelled(id, clock.instant()));
    return view(e);
  }

  // Caller must hold a transaction: the lock serializes lifecycle, registrations, and check-in.
  @Transactional(propagation = Propagation.MANDATORY)
  public EventView lock(UUID id) {
    return view(events.lock(id).orElseThrow(ApiException::notFound));
  }

  public void requireOwner(EventView event, Actor actor) {
    actor.requireManager();
    if (!actor.admin() && !actor.id().equals(event.organizerId())) throw ApiException.forbidden();
  }
}
