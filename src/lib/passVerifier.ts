import { publicClient, ONE_UP_TOKEN } from "@/lib/viem";
import { parseUnits, decodeEventLog } from "viem";

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

export type VerifyResult =
  | { ok: true;  blockNumber: bigint; paidAt: Date }
  | { ok: false; reason: string };

export async function verifyPassTransfer(
  txHash: `0x${string}`,
  expectedFrom: string,
  expectedTo: string,
  expectedTokenAmount: number,
): Promise<VerifyResult> {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, reason: "Transacción no encontrada en la blockchain." };
  }

  if (receipt.status !== "success") {
    return { ok: false, reason: "La transacción falló en la blockchain." };
  }

  const expectedWei = parseUnits(expectedTokenAmount.toString(), ONE_UP_TOKEN.decimals);

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ONE_UP_TOKEN.address.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: TRANSFER_EVENT_ABI, data: log.data, topics: log.topics });
      const { from, to, value } = decoded.args;
      if (
        from.toLowerCase()  === expectedFrom.toLowerCase() &&
        to.toLowerCase()    === expectedTo.toLowerCase()   &&
        value               >= expectedWei
      ) {
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        return {
          ok: true,
          blockNumber: receipt.blockNumber,
          paidAt: new Date(Number(block.timestamp) * 1000),
        };
      }
    } catch {
      continue;
    }
  }

  return { ok: false, reason: "No se encontró la transferencia de $1UP en la transacción." };
}
