import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseUnits, encodeEventTopics } from "viem";

const { mockGetTransactionReceipt, mockGetBlockNumber, mockGetBlock } = vi.hoisted(() => ({
  mockGetTransactionReceipt: vi.fn(),
  mockGetBlockNumber:        vi.fn(),
  mockGetBlock:              vi.fn(),
}));

vi.mock("@/lib/viem", () => ({
  publicClient: {
    getTransactionReceipt: mockGetTransactionReceipt,
    getBlockNumber:        mockGetBlockNumber,
    getBlock:              mockGetBlock,
  },
  ONE_UP_TOKEN: {
    address: "0xf6813c71e620c654ff6049a485e38d9494efabdf",
    decimals: 18,
    symbol: "1UP",
  },
}));

import { verifyPassTransfer, MIN_CONFIRMATIONS } from "@/lib/passVerifier";

const TREASURY = "0x1111111111111111111111111111111111111111";
const PAYER    = "0x2222222222222222222222222222222222222222";
const TX       = "0xabcd000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ONE_UP   = "0xf6813c71e620c654ff6049a485e38d9494efabdf";

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

function transferLog(from: string, to: string, valueWei: bigint, address = ONE_UP) {
  const topics = encodeEventTopics({
    abi: TRANSFER_EVENT_ABI,
    eventName: "Transfer",
    args: { from: from as `0x${string}`, to: to as `0x${string}` },
  });
  const data = ("0x" + valueWei.toString(16).padStart(64, "0")) as `0x${string}`;
  return { address, topics, data };
}

describe("verifyPassTransfer — H-8 confirmation depth + exact amount", () => {
  beforeEach(() => {
    mockGetTransactionReceipt.mockReset();
    mockGetBlockNumber.mockReset();
    mockGetBlock.mockReset();
  });

  it("returns ok for an exact-amount transfer with enough confirmations", async () => {
    const expected = parseUnits("100", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(PAYER, TREASURY, expected)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);
    mockGetBlock.mockResolvedValueOnce({ timestamp: 1_700_000_000n });

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(true);
    expect(r.ok && r.blockNumber).toBe(1000n);
  });

  it("rejects a tx that has not yet reached the confirmation depth", async () => {
    const expected = parseUnits("100", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(PAYER, TREASURY, expected)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n); // only 1 confirmation

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("confirmations_pending");
  });

  it("rejects overpayment (exact amount required by H-8)", async () => {
    const tooMuch = parseUnits("150", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(PAYER, TREASURY, tooMuch)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("amount_mismatch");
  });

  it("rejects underpayment", async () => {
    const tooLittle = parseUnits("50", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(PAYER, TREASURY, tooLittle)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("amount_mismatch");
  });

  it("rejects a failed transaction", async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "reverted",
      blockNumber: 1000n,
      logs: [],
    });

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("failed");
  });

  it("rejects a tx with no $1UP Transfer log", async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("no_transfer");
  });

  it("rejects a Transfer log on a different token contract", async () => {
    const wrongAddr = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(PAYER, TREASURY, parseUnits("100", 18), wrongAddr)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("no_transfer");
  });

  it("rejects when the tx is not found on-chain", async () => {
    mockGetTransactionReceipt.mockRejectedValueOnce(new Error("not found"));

    const r = await verifyPassTransfer(TX, PAYER, TREASURY, 100);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("not_found");
  });
});
