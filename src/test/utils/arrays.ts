export function arrayEquality<T>(array1: T[], array2: T[]): boolean {
  if (array1.length != array2.length) {
    return false;
  }

  return array1.every((elt, index) => {
    return elt === array2[index];
  });
}
