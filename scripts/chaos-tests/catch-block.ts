// @ts-nocheck
// Rule 21: Explicit Catch-Block Type-Guarding violations

declare function someCall(): Promise<void>;

export async function violationNakedBinding() {
  try {
    await someCall();
  } catch (err) {
    // VIOLATION: not typed as ': unknown'
    console.error(err.message);
    // VIOLATION: no type-guard before property access
  }
}

export async function violationNoTypeGuard() {
  try {
    await someCall();
  } catch (error: unknown) {
    console.error(error.message);
    // VIOLATION: no type-guard before property access
  }
}

// Valid patterns (should NOT trigger violations):
export async function validUnboundCatch() {
  try {
    await someCall();
  } catch {
    // OK: no variable binding, no access
  }
}

export async function validTypedWithGuard() {
  try {
    await someCall();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

export async function validSafeUsage() {
  try {
    await someCall();
  } catch (error: unknown) {
    console.error(error);
    throw error;
  }
}
