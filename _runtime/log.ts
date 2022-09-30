const alreadyWarned = new Map<string, boolean>();

export function warnOnce(condition: boolean, message: string): void {
  if (!condition && !alreadyWarned.has(message)) {
    alreadyWarned.set(message, true);
    console.warn(message);
  }
}
