package com.acme.gather.registrations.internal;

import com.acme.gather.identity.IdentityService;
import com.acme.gather.registrations.*;
import com.acme.gather.shared.PageResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class RegistrationController {
  private final RegistrationService registrations;
  private final IdentityService identity;

  public RegistrationController(RegistrationService registrations, IdentityService identity) {
    this.registrations = registrations;
    this.identity = identity;
  }

  @PostMapping("/api/events/{id}/registrations")
  RegistrationView register(Authentication auth, @PathVariable UUID id) {
    return registrations.register(identity.current(auth), id);
  }

  @GetMapping("/api/registrations")
  PageResponse<RegistrationView> mine(
      Authentication auth,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return registrations.mine(identity.current(auth), page, size);
  }

  @PostMapping("/api/registrations/{id}/cancel")
  RegistrationView cancel(Authentication auth, @PathVariable UUID id) {
    return registrations.cancel(identity.current(auth), id);
  }

  @GetMapping("/api/manage/events/{id}/registrations")
  PageResponse<RegistrationView> attendees(
      Authentication auth,
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return registrations.attendees(identity.current(auth), id, page, size);
  }
}
