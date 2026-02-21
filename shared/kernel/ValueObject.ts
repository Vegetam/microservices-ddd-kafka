/**
 * Base class for all Value Objects.
 * Value objects are immutable and compared by their properties, not identity.
 */
export abstract class ValueObject<T> {
  protected constructor(protected readonly props: T) {
    Object.freeze(this);
  }

  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
