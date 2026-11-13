-- SQL CHECK accepts UNKNOWN, so IN alone does not reject a NULL reason.
ALTER TABLE registration ADD CONSTRAINT registration_cancelled_reason_required
  CHECK (status <> 'CANCELLED' OR cancellation_reason IS NOT NULL);
