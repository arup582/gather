package com.acme.gather.identity.internal;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserAccount, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select u from UserAccount u where u.role=com.acme.gather.identity.Role.ADMIN order by u.id")
  List<UserAccount> lockAdministrators();

  Optional<UserAccount> findByEmail(String email);
}
