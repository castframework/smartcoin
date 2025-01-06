export function getEventArgsInReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  receipt: any,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const event = receipt.events.find((event) => event.event === eventName);

  if (event === undefined) {
    throw Error(`Event [${eventName}] not found in receipt`);
  }

  return event.args;
}

export const anyNonEmptyString = (val: unknown): boolean =>
  typeof val === 'string' && val.length !== 0;
