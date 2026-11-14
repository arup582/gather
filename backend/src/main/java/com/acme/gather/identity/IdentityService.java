package com.acme.gather.identity;

import com.acme.gather.identity.internal.*;
import com.acme.gather.shared.*;
import java.time.Clock;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IdentityService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final Clock clock;

  public IdentityService(UserRepository users, PasswordEncoder encoder, Clock clock) {
    this.users = users;
    this.encoder = encoder;
    this.clock = clock;
  }

  public Actor signup(String email, String name, String password) {
    return create(email, name, password, Role.ATTENDEE);
  }

  public Actor createUser(Actor actor, String email, String name, String password, Role role) {
    requireActiveAdministrator(actor);
    return create(email, name, password, role);
  }

  public Actor create(String email, String name, String password, Role role) {
    if (password.length() < 12
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "Password must contain at least 12 characters and at most 72 UTF-8 bytes");
    email = email.trim().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent())
      throw ApiException.conflict("An account with that email already exists");
    return users
        .save(new UserAccount(email, name.trim(), encoder.encode(password), role, clock.instant()))
        .view();
  }

  @Transactional(readOnly = true)
  public Actor current(Authentication auth) {
    if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser"))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in");
    var user =
        users
            .findByEmail(auth.getName())
            .filter(u -> u.enabled)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again"));
    // Reload permissions for every operation: revocations apply to existing sessions immediately.
    return user.view();
  }

  @Transactional(readOnly = true)
  public Actor byId(UUID id) {
    return users.findById(id).orElseThrow(ApiException::notFound).view();
  }

  @Transactional(readOnly = true)
  public PageResponse<Actor> list(Actor actor, int page, int size) {
    actor.requireAdmin();
    return PageResponse.of(
        users
            .findAll(
                org.springframework.data.domain.PageRequest.of(
                    PageResponse.request(page, size).getPageNumber(),
                    size,
                    org.springframework.data.domain.Sort.by("email")))
            .map(UserAccount::view));
  }

  public Actor update(Actor actor, UUID id, Role role, boolean enabled) {
    requireActiveAdministrator(actor);
    if (actor.id().equals(id) && (role != Role.ADMIN || !enabled))
      throw ApiException.conflict("You cannot remove your own administrator access");
    var u = users.findById(id).orElseThrow(ApiException::notFound);
    u.role = role;
    u.enabled = enabled;
    return u.view();
  }

  private void requireActiveAdministrator(Actor actor) {
    actor.requireAdmin();
    // Serialize admin writes and recheck access after any concurrent permission change.
    users.lockAdministrators();
    var current = users.findById(actor.id()).orElseThrow(ApiException::forbidden);
    if (!current.enabled || current.role != Role.ADMIN) throw ApiException.forbidden();
  }

  public Optional<Actor> find(String email) {
    return users.findByEmail(email).map(UserAccount::view);
  }
}
