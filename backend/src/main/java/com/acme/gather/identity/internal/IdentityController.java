package com.acme.gather.identity.internal;

import com.acme.gather.identity.*;
import com.acme.gather.shared.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
public class IdentityController {
  private final IdentityService identity;

  public IdentityController(IdentityService identity) {
    this.identity = identity;
  }

  record Signup(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 100) String displayName,
      @NotNull @Size(min = 12, max = 72) String password) {}

  record Update(@NotNull Role role, @NotNull Boolean enabled) {}

  record CreateUser(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 100) String displayName,
      @NotNull @Size(min = 12, max = 72) String password,
      @NotNull Role role) {}

  @GetMapping("/api/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @GetMapping("/api/auth/me")
  Actor me(Authentication auth) {
    return identity.current(auth);
  }

  @PostMapping("/api/auth/signup")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  Actor signup(@Valid @RequestBody Signup r) {
    return identity.signup(r.email(), r.displayName(), r.password());
  }

  @GetMapping("/api/admin/users")
  PageResponse<Actor> users(
      Authentication auth,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return identity.list(identity.current(auth), page, size);
  }

  @PatchMapping("/api/admin/users/{id}")
  Actor update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody Update r) {
    return identity.update(identity.current(auth), id, r.role(), r.enabled());
  }

  @PostMapping("/api/admin/users")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  Actor createUser(Authentication auth, @Valid @RequestBody CreateUser r) {
    return identity.createUser(
        identity.current(auth), r.email(), r.displayName(), r.password(), r.role());
  }
}
