package com.acme.gather.shared;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResponse<T>(List<T> content, int page, int totalPages, long totalElements) {
  public static <T> PageResponse<T> of(Page<T> p) {
    return new PageResponse<>(
        p.getContent(), p.getNumber(), p.getTotalPages(), p.getTotalElements());
  }

  public static org.springframework.data.domain.Pageable request(int page, int size) {
    if (page < 0 || size < 1 || size > 100)
      throw new ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Page must be non-negative and size between 1 and 100");
    return org.springframework.data.domain.PageRequest.of(page, size);
  }
}
