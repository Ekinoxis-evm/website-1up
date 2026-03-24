"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_BALANCE_ABI } from "@/lib/viem";

export function use1upBalance(address: `0x${string}` | undefined) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    publicClient
      .readContract({
        address: ONE_UP_TOKEN.address,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address],
      })
      .then((raw) => {
        if (cancelled) return;
        const formatted = parseFloat(formatUnits(raw as bigint, ONE_UP_TOKEN.decimals));
        setBalance(
          formatted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { balance, loading, error };
}
