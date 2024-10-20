import assert from "assert";

/**
 * intended to replicate ES2024 Promise.withResolvers:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
 */
export function promiseWithResolvers<T>() {
  // hacky solution to: https://github.com/microsoft/TypeScript/issues/45658
  //   (aka https://github.com/microsoft/TypeScript/issues/9998)
  let resolve = undefined as ((value: T | PromiseLike<T>) => void) | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reject = undefined as ((reason?: any) => void) | undefined;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  assert(resolve !== undefined, "resolve must be defined");
  assert(reject !== undefined, "reject must be defined");
  return { promise, resolve, reject };
}
