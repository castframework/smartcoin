// assert if "eventName" is in transaction log ; return event index if found, -1 otherwise
export function assertEvent(
  response: Truffle.TransactionResponse<Truffle.AnyEvent>,
  eventName: string,
): number {
  const eventIndex = response.logs.findIndex((log) => log.event === eventName);

  assert.isTrue(eventIndex !== -1, `${eventName} event should fire`);

  return eventIndex;
}

export function assertEventArgs(
  response: Truffle.TransactionResponse<Truffle.AnyEvent>,
  eventIndex: number,
  argName: string,
  expectedValue: unknown,
): void {
  assert.equal(
    response.logs[eventIndex].args[argName],
    expectedValue,
    `${argName} expected to be equal to ${expectedValue}`,
  );
}
