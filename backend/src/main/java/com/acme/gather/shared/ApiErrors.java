package com.acme.gather.shared;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiErrors {
  public record Error(String message, Map<String, String> fields) {}

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Error> domain(ApiException e) {
    return ResponseEntity.status(e.status()).body(new Error(e.getMessage(), Map.of()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Error> validation(MethodArgumentNotValidException e) {
    var fields = new LinkedHashMap<String, String>();
    e.getBindingResult()
        .getFieldErrors()
        .forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest()
        .body(new Error("Please correct the highlighted fields", fields));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    HandlerMethodValidationException.class
  })
  ResponseEntity<Error> badRequest(Exception e) {
    return ResponseEntity.badRequest()
        .body(new Error("Invalid request. Check field values and dates.", Map.of()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Error> constraint(DataIntegrityViolationException e) {
    return ResponseEntity.status(409)
        .body(new Error("This operation conflicts with an existing record", Map.of()));
  }
}
