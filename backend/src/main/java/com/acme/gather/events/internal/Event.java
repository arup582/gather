package com.acme.gather.events.internal;

import com.acme.gather.events.*;
import com.acme.gather.shared.ApiException;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event")
public class Event {
  @Id public UUID id;
  public String title;

  @Column(length = 10000)
  public String description;

  public String venue;
  public Instant startsAt;
  public Instant endsAt;
  public UUID organizerId;

  @Enumerated(EnumType.STRING)
  public EventStatus status;

  public Instant createdAt;
  public Instant publishedAt;

  protected Event() {}

  public Event(UUID organizer, EventInput input, Instant now) {
    id = UUID.randomUUID();
    organizerId = organizer;
    status = EventStatus.DRAFT;
    createdAt = now;
    edit(input, now);
  }

  public void edit(EventInput input, Instant now) {
    if (status == EventStatus.CANCELLED)
      throw ApiException.conflict("Cancelled events cannot be edited");
    if (startsAt != null && !startsAt.isAfter(now))
      throw ApiException.conflict("Started events cannot be edited");
    if (!input.startsAt().isAfter(now))
      throw ApiException.conflict("The start must be in the future");
    if (!input.endsAt().isAfter(input.startsAt()))
      throw ApiException.conflict("The end must be after the start");
    if (status == EventStatus.PUBLISHED
        && (!startsAt.equals(input.startsAt()) || !endsAt.equals(input.endsAt())))
      throw ApiException.conflict(
          "Published event times cannot change. Cancel and create a new event if rescheduling.");
    title = input.title().trim();
    description = input.description().trim();
    venue = input.venue().trim();
    startsAt = input.startsAt();
    endsAt = input.endsAt();
  }

  public void publish(Instant now) {
    if (status == EventStatus.PUBLISHED) return;
    if (status != EventStatus.DRAFT) throw ApiException.conflict("Only drafts can be published");
    if (!startsAt.isAfter(now)) throw ApiException.conflict("Started events cannot be published");
    status = EventStatus.PUBLISHED;
    publishedAt = now;
  }

  public boolean cancel() {
    if (status == EventStatus.CANCELLED) return false;
    status = EventStatus.CANCELLED;
    return true;
  }

  public EventView view(String name) {
    return new EventView(
        id, title, description, venue, startsAt, endsAt, organizerId, name, status);
  }
}
