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

import { verifyTokenTransfer } from "@/lib/tokenTransferVerifier";
import { MIN_CONFIRMATIONS } from "@/lib/passVerifier";

const TREASURY  = "0x1111111111111111111111111111111111111111";
const USER      = "0x2222222222222222222222222222222222222222";
const ATTACKER  = "0x3333333333333333333333333333333333333333";
const TX        = "0xabcd000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ONE_UP    = "0xf6813c71e620c654ff6049a485e38d9494efabdf";

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

describe("verifyTokenTransfer — H-3 admin approval on-chain verification", () => {
  beforeEach(() => {
    mockGetTransactionReceipt.mockReset();
    mockGetBlockNumber.mockReset();
    mockGetBlock.mockReset();
  });

  it("accepts a valid treasury → user transfer with enough confirmations", async () => {
    const exact = parseUnits("1000", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(TREASURY, USER, exact)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);
    mockGetBlock.mockResolvedValueOnce({ timestamp: 1_700_000_000n });

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(true);
    expect(r.ok && r.blockNumber).toBe(1000n);
  });

  it("accepts a small overpayment (cop_amount/exchange_rate rounding) — value >= min", async () => {
    const slightlyMore = parseUnits("1000.01", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(TREASURY, USER, slightlyMore)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);
    mockGetBlock.mockResolvedValueOnce({ timestamp: 1_700_000_000n });

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(true);
  });

  it("rejects a treasury → ATTACKER transfer (recipient mismatch — IDOR defense)", async () => {
    const exact = parseUnits("1000", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(TREASURY, ATTACKER, exact)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("no_transfer");
  });

  it("rejects underpayment", async () => {
    const tooLittle = parseUnits("500", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(TREASURY, USER, tooLittle)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n + MIN_CONFIRMATIONS);

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("amount_too_low");
  });

  it("rejects a transfer that has not yet reached the confirmation depth", async () => {
    const exact = parseUnits("1000", 18);
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      blockNumber: 1000n,
      logs: [transferLog(TREASURY, USER, exact)],
    });
    mockGetBlockNumber.mockResolvedValueOnce(1000n);

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("confirmations_pending");
  });

  it("rejects a reverted transaction", async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({
      status: "reverted",
      blockNumber: 1000n,
      logs: [],
    });

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("failed");
  });

  it("rejects a tx not found on the network", async () => {
    mockGetTransactionReceipt.mockRejectedValueOnce(new Error("missing"));

    const r = await verifyTokenTransfer(TX, TREASURY, USER, 1000);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("not_found");
  });
});
