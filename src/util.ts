export async function asyncForEach<T>(
  array: Array<T>,
  callback: (x: T, index: number, array: Array<T>) => Promise<void>
) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export async function asyncFilter<T>(
  array: Array<T>,
  callback: (x: T, index: number, array: Array<T>) => Promise<boolean>
) {
  const fail = Symbol();
  function passed<T>(x: T | typeof fail): x is T {
    return x !== fail;
  }

  const map = array.map(async (item, index, array) => (await callback(item, index, array)) ? item : fail);
  return (await Promise.all(map)).filter(passed);
}
