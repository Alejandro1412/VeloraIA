export type BookingErrorCode =
  | "slot_taken"
  | "not_found"
  | "invalid_service"
  | "outside_hours"
  | "already_cancelled";

export class BookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}
