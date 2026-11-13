package com.acme.gather.identity.internal;

import com.acme.gather.identity.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class UserAccount {
  @Id public UUID id;
  public String email;
  public String displayName;
  public String passwordHash;

  @Enumerated(EnumType.STRING)
  public Role role;

  public boolean enabled;
  public Instant createdAt;

  protected UserAccount() {}

  public UserAccount(String email, String displayName, String hash, Role role, Instant now) {
    this.id = UUID.randomUUID();
    this.email = email;
    this.displayName = displayName;
    this.passwordHash = hash;
    this.role = role;
    this.enabled = true;
    this.createdAt = now;
  }

  public Actor view() {
    return new Actor(id, email, displayName, role, enabled);
  }
}
