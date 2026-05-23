import { publicClient, ONE_UP_TOKEN } from "@/lib/viem";
import { parseUnits, decodeEventLog } from "viem";
import { MIN_CONFIRMATIONS } from "@/lib/passVerifier";

const TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from",  type: "address", indexed: true  },
      { name: "to",    type: "address", indexed: true  },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

export type TokenTransferVerifyResult =
  | {
      ok: true;
      blockNumber: bigint;
      confirmations: bigint;
      paidAt: Date;
      valueWei: bigint;
    }
  | {
      ok: false;
      reason: string;
      code:
        | "not_found"
        | "failed"
        | "no_transfer"
        | "amount_too_low"
        | "confirmations_pending"
        | "rpc_error";
    };

/**
 * Server-side verification of a $1UP transfer on Base mainnet. Used by the
 * admin token-order approval path (H-3 audit fix) to confirm that the admin
 * actually paid the user before flipping the order to `approved`.
 *
 * Rules:
 *   1. The tx must exist and have receipt.status === "success".
 *   2. It must contain a `Transfer` log on `ONE_UP_TOKEN.address` whose
 *      `from`/`to` match `expectedFrom`/`expectedTo` (case-insensitive).
 *   3. `value` MUST be >= `minAmountTokens` parsed at the token's decimals.
 *      Overpayment is accepted on this path because token-order amounts are
 *      computed from `cop_amount / exchange_rate_cop` and the admin's wallet
 *      may round up — but never less than what the user paid for.
 *   4. The tx must have at least `MIN_CONFIRMATIONS` confirmations (reorg
 *      safety).
 */
export async function verifyTokenTransfer(
  txHash: `0x${string}`,
  expectedFrom: string,
  expectedTo: string,
  minAmountTokens: number,
): Promise<TokenTransferVerifyResult> {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return {
      ok: false,
      reason: "Transacción no encontrada en la blockchain.",
      code: "not_found",
    };
  }

  if (receipt.status !== "success") {
    return {
      ok: false,
      reason: "La transacción falló en la blockchain.",
      code: "failed",
    };
  }

  let currentBlock: bigint;
  try {
    currentBlock = await publicClient.getBlockNumber();
  } catch {
    return {
      ok: false,
      reason: "No se pudo verificar la profundidad de confirmación. Intenta de nuevo.",
      code: "rpc_error",
    };
  }
  const confirmations = currentBlock >= receipt.blockNumber
    ? currentBlock - receipt.blockNumber + BigInt(1)
    : BigInt(0);
  if (confirmations < MIN_CONFIRMATIONS) {
    return {
      ok: false,
      reason: `Esperando confirmaciones (${confirmations}/${MIN_CONFIRMATIONS}). Intenta de nuevo en unos segundos.`,
      code: "confirmations_pending",
    };
  }

  const minWei = parseUnits(minAmountTokens.toString(), ONE_UP_TOKEN.decimals);
  let underpayment = false;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ONE_UP_TOKEN.address.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: TRANSFER_EVENT_ABI, data: log.data, topics: log.topics });
      const { from, to, value } = decoded.args;
      if (
        from.toLowerCase() !== expectedFrom.toLowerCase() ||
        to.toLowerCase()   !== expectedTo.toLowerCase()
      ) {
        continue;
      }
      if (value < minWei) {
        underpayment = true;
        continue;
      }
      const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
      return {
        ok: true,
        blockNumber: receipt.blockNumber,
        confirmations,
        paidAt: new Date(Number(block.timestamp) * 1000),
        valueWei: value,
      };
    } catch {
      continue;
    }
  }

  if (underpayment) {
    return {
      ok: false,
      reason: "El monto transferido es menor al de la orden.",
      code: "amount_too_low",
    };
  }

  return {
    ok: false,
    reason: "No se encontró la transferencia de $1UP entre las wallets esperadas.",
    code: "no_transfer",
  };
}
