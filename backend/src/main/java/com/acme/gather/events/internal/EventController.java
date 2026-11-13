package com.acme.gather.events.internal;

import com.acme.gather.events.*;
import com.acme.gather.identity.*;
import com.acme.gather.shared.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class EventController {
  private final EventService events;
  private final IdentityService identity;

  public EventController(EventService events, IdentityService identity) {
    this.events = events;
    this.identity = identity;
  }

  @GetMapping("/api/events")
  PageResponse<EventView> browse(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "12") int size) {
    return events.browse(q, page, size);
  }

  @GetMapping("/api/events/{id}")
  EventView get(@PathVariable UUID id, Authentication auth) {
    return events.get(id, auth == null ? null : identity.current(auth));
  }

  @GetMapping("/api/manage/events")
  PageResponse<EventView> managed(
      Authentication auth,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return events.managed(identity.current(auth), page, size);
  }

  @PostMapping("/api/manage/events")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  EventView create(Authentication auth, @Valid @RequestBody EventInput r) {
    return events.create(identity.current(auth), r);
  }

  @PutMapping("/api/manage/events/{id}")
  EventView edit(Authentication auth, @PathVariable UUID id, @Valid @RequestBody EventInput r) {
    return events.edit(identity.current(auth), id, r);
  }

  @PostMapping("/api/manage/events/{id}/publish")
  EventView publish(Authentication auth, @PathVariable UUID id) {
    return events.publish(identity.current(auth), id);
  }

  @PostMapping("/api/manage/events/{id}/cancel")
  EventView cancel(Authentication auth, @PathVariable UUID id) {
    return events.cancel(identity.current(auth), id);
  }
}
