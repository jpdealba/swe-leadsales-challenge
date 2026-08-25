/**
 * Lead entity.
 *
 * A lead represents a potential customer inside a funnel.
 * It is identified by its phone number within a funnel.
 */
export class Lead {
  /**
   * Reduces a phone number to its digits. Two phone numbers identify the same
   * lead when their normalized forms match.
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  constructor(
    public readonly phone: string,
    public readonly name: string,
    public stageId: string
  ) {
    this.phone = Lead.normalizePhone(phone);
  }
}
