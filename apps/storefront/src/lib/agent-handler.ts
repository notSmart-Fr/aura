/**
 * Zero-Trust Conversational Routing Handler
 * Provides local Preprocessor, Postprocessor, and Hard Restraints engines.
 */

export class IdObfuscator {
  private realToOpaque = new Map<string, string>();
  private opaqueToReal = new Map<string, string>();
  private counter = 0;

  constructor() {}

  /**
   * Translates a sensitive real ID (e.g., cart_123 or customer_456) into a safe, ephemeral token.
   */
  public obfuscate(realId: string, prefix: string = "actor"): string {
    if (!realId) return realId;
    if (realId.includes("_opaque_")) {
      return realId;
    }
    let opaque = this.realToOpaque.get(realId);
    if (!opaque) {
      this.counter++;
      opaque = `${prefix}_opaque_${this.counter}_${Math.random().toString(36).substring(2, 6)}`;
      this.realToOpaque.set(realId, opaque);
      this.opaqueToReal.set(opaque, realId);
    }
    return opaque;
  }

  /**
   * Restores the real ID from the ephemeral token.
   */
  public deobfuscate(opaqueId: string): string {
    if (!opaqueId) return opaqueId;
    return this.opaqueToReal.get(opaqueId) || opaqueId;
  }
}

export interface RestraintResult<T> {
  args: T;
  restraintApplied: boolean;
  message?: string;
}

/**
 * Hard Restraints Engine
 * Enforces business constraints on tool arguments before execution.
 */
export const HardRestraints = {
  /**
   * Clamps any product search maxPrice exceeding $500, or missing entirely, down to $150.
   */
  searchCatalog(args: { query: string; maxPrice?: number }): RestraintResult<{ query: string; maxPrice: number }> {
    let maxPrice = args.maxPrice;
    let restraintApplied = false;
    let message: string | undefined = undefined;

    if (maxPrice === undefined || maxPrice === null) {
      maxPrice = 150;
      restraintApplied = true;
      message = "Note: Maximum price filter was unspecified and default ceiling of $150 was applied.";
    } else if (maxPrice > 500) {
      maxPrice = 150;
      restraintApplied = true;
      message = `Note: Maximum price filter of $${args.maxPrice} exceeded the threshold and was capped at $150.`;
    } else {
      maxPrice = maxPrice;
    }

    return {
      args: {
        ...args,
        maxPrice,
      },
      restraintApplied,
      message,
    };
  },

  /**
   * Caps any cart addition quantity exceeding 5 items down to exactly 1.
   */
  modifyCart(args: { handle: string; action: "ADD" | "REMOVE"; quantity: number }): RestraintResult<{
    handle: string;
    action: "ADD" | "REMOVE";
    quantity: number;
  }> {
    let quantity = args.quantity;
    let restraintApplied = false;
    let message: string | undefined = undefined;

    if (args.action === "ADD" && quantity > 5) {
      quantity = 1;
      restraintApplied = true;
      message = `Note: Add quantity of ${args.quantity} exceeded the per-order limit and was capped at 1.`;
    }

    return {
      args: {
        ...args,
        quantity,
      },
      restraintApplied,
      message,
    };
  },
};

export interface ChatResponseFallback {
  type: "CHAT_RESPONSE";
  message: string;
}

/**
 * Postprocessor fallback output to ensure ZERO CRASH policy.
 */
export const COMPASSIONATE_FALLBACK: ChatResponseFallback = {
  type: "CHAT_RESPONSE",
  message: "I encountered a minor formatting glitch while organizing your request. Could you rephrase your question?",
};
