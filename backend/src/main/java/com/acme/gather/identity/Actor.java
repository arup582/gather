package com.acme.gather.identity;

import com.acme.gather.shared.ApiException;
import java.util.UUID;

public record Actor(UUID id, String email, String displayName, Role role, boolean enabled) {
  public boolean admin() {
    return role == Role.ADMIN;
  }

  public void requireManager() {
    if (role == Role.ATTENDEE) throw ApiException.forbidden();
  }

  public void requireAdmin() {
    if (!admin()) throw ApiException.forbidden();
  }
}
