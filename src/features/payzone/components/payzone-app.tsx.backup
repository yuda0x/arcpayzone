"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ethers } from "ethers";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Icons, type Icon } from "@/components/icons";
import { useCanonicalWallet } from "@/hooks/use-canonical-wallet";
import { AudcStakingPanel } from "@/features/payzone/components/audc-staking-panel";
import { useAudcStakingPosition } from "@/features/payzone/hooks/use-audc-staking-position";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  USDC_ADDRESS,
  ARC_NATIVE_USDC_DECIMALS,
  FACTORY_ADDRESS,
  ROUTER_ADDRESS,
  DAILY_GM_ADDRESS,
  DAILY_GM_ABI,
  USDC_DECIMALS,
  EURC_DECIMALS,
  LP_DECIMALS,
  ERC20_ABI as TOKEN_ABI,
  ROUTER_ABI,
  PAIR_ABI,
  applySlippage,
  BALANCE_CACHE_MS,
  fetchPairState,
  formatDisplay,
  formatExact,
  formatPretty,
  formatSharePercent,
  getArcReadProvider,
  getTxErrorMessage,
  invalidatePairCache,
  isAmountDraft,
  parseAmount,
  slippageLabel,
  SLIPPAGE_PRESETS,
  swapDeadline,
  underlyingFromLp,
} from "@/features/payzone/contracts";

const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_ID_HEX = "0x4cef52";
const ARC_RPC = "https://rpc.testnet.arc.io";
const ARC_EXPLORER = "https://testnet.arcscan.app";
const ARC_FAUCET = "https://faucet.circle.com";

const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const ANS_CONTRACT_ADDRESS = "0x68A2a776BaE48fd0bB7a409a9709d61A34Ced42c";

// REAL DEPLOYED SMART CONTRACTS
const EURC_VAULT_ADDRESS = "0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC"; 
const USDC_VAULT_ADDRESS = "0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8";
const USDC_CLAIM_ADAPTER_ADDRESS = process.env.NEXT_PUBLIC_USDC_CLAIM_ADAPTER_ADDRESS || "";
const EURC_CLAIM_ADAPTER_ADDRESS = process.env.NEXT_PUBLIC_EURC_CLAIM_ADAPTER_ADDRESS || "";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ANS_ABI = [
  "function register(string _name) external",
  "function resolve(string _name) external view returns (address)",
  "function isAvailable(string _name) external view returns (bool)"
];

const EURC_VAULT_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function stakedBalance(address) external view returns (uint256)",
  "function getPendingYield(address user) external view returns (uint256)"
];

const USDC_VAULT_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function stakedBalance(address) external view returns (uint256)",
  "function getPendingYield(address user) external view returns (uint256)"
];

const CLAIM_ADAPTER_ABI = [
  "function claimable(address account) view returns (uint256)",
  "function claimed(address account) view returns (uint256)",
  "function rewardLiquidity() view returns (uint256)",
  "function claim() returns (uint256)"
];



type ActivityItem = {
  id: number;
  label: string;
  amount: string;
  meta: string;
  status: "Completed" | "Pending" | "Failed";
  txHash?: string;
};

type PayZoneTab = "overview" | "portfolio" | "send" | "request" | "receive" | "faucet" | "swap" | "lp" | "dailygm" | "domains" | "history" | "learn";

const isPayZoneTab = (value: string | null): value is PayZoneTab =>
  value === "overview" || value === "portfolio" || value === "send" || value === "request" || value === "receive" || value === "faucet" || value === "swap" || value === "lp" || value === "dailygm" || value === "domains" || value === "history" || value === "learn";

const aboutGroups: Array<{
  title: string;
  cards: Array<{ title: string; description: string; icon: Icon }>;
}> = [
  {
    title: 'Payments',
    cards: [
      {
        title: 'Send Payments',
        description: 'Send USDC or EURC directly from your connected wallet, with support for wallet addresses and .arc-based recipients. The flow is designed around explicit confirmation before a transaction is submitted.',
        icon: Icons.send
      },
      {
        title: 'Receive',
        description: 'Share your wallet address through a dedicated receiving surface and QR code. When a wallet is connected, ARC PayZone turns the receiving address into a simple, ready-to-share payment endpoint.',
        icon: Icons.creditCard
      },
      {
        title: 'Payment Requests',
        description: 'Create payment links with a selected asset and amount, then share the generated request with another party. Requests prepare the payment details without automatically submitting a transaction.',
        icon: Icons.share
      },
      {
        title: '.arc Identity',
        description: 'Use human-readable .arc identities instead of relying exclusively on long hexadecimal wallet addresses. The domain layer makes wallet-based interactions easier to recognize, share, and resolve.',
        icon: Icons.user
      }
    ]
  },
  {
    title: 'Assets & DeFi',
    cards: [
      {
        title: 'Portfolio',
        description: 'Review your connected asset positions and keep the value you manage on Arc organized in one place. Portfolio provides the starting point for understanding what is available before taking action.',
        icon: Icons.dashboard
      },
      {
        title: 'Arc PayZone Swap',
        description: 'Move between supported stablecoins through the PayZone swap interface. The workflow brings asset selection, amount input, slippage controls, routing, and transaction confirmation into one focused experience.',
        icon: Icons.sparkles
      },
      {
        title: 'Liquidity',
        description: 'Provide liquidity to the supported USDC/EURC pool and manage the position from the PayZone interface. The liquidity workflow keeps deposits, pool participation, and LP-related actions together in one surface.',
        icon: Icons.adjustments
      },
      {
        title: 'DeFi Vault',
        description: 'Explore the available vault interface for supported stablecoin positions and review the yield information associated with those positions. Claiming and reward behavior remain dependent on the configured vault contracts and available claim methods.',
        icon: Icons.lock
      }
    ]
  },
  {
    title: 'Arc Utilities',
    cards: [
      {
        title: 'Daily GM',
        description: 'Turn a simple daily check-in into an on-chain streak. Daily GM records your participation through an Arc transaction and gives the activity a lightweight social and consistency layer.',
        icon: Icons.sun
      },
      {
        title: 'Arc Testnet Faucet',
        description: 'Access the configured testnet faucet directly from PayZone when test assets are needed for development and testing. The faucet action remains external and does not trigger an internal payment transaction.',
        icon: Icons.upload
      },
      {
        title: 'Activity History',
        description: 'Keep track of PayZone actions and transaction-related activity from a dedicated history surface. It provides a practical reference point when reviewing what you have done across the platform.',
        icon: Icons.clock
      }
    ]
  },
  {
    title: 'Platform',
    cards: [
      {
        title: 'Dashboard Overview',
        description: 'Keep your activity in view from a single operational surface. Monitor balances, recent activity, and the broader payment picture before moving into a specific workflow.',
        icon: Icons.dashboard
      }
    ]
  }
];

function parsePaymentRequest(params: URLSearchParams): { to: string; amount: string; token: "USDC" | "EURC" } | null {
  const to = params.get("to")?.trim() || "";
  const amount = params.get("amount")?.trim() || "";
  const token = params.get("token");
  const requestToken = token === "USDC" || token === "EURC" ? token : null;
  const decimals = requestToken ? 6 : -1;

  if (!ethers.isAddress(to) || !requestToken || !/^\d+(\.\d+)?$/.test(amount)) return null;
  const [, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) return null;

  try {
    const parsed = ethers.parseUnits(amount, decimals);
    if (parsed <= BigInt(0)) return null;
  } catch {
    return null;
  }

  return { to, amount, token: requestToken };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let countdownSnapshot = 0;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
const countdownListeners = new Set<() => void>();

const subscribeToCountdown = (listener: () => void) => {
  countdownListeners.add(listener);
  if (!countdownTimer) {
    countdownTimer = setInterval(() => {
      countdownSnapshot = Date.now();
      countdownListeners.forEach((currentListener) => currentListener());
    }, 1000);
  }

  return () => {
    countdownListeners.delete(listener);
    if (countdownListeners.size === 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };
};

const getCountdownSnapshot = () => countdownSnapshot;

export default function Home() {
  const canonicalWallet = useCanonicalWallet();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";
  const wallet = canonicalWallet.address ?? "";
  const chainId = canonicalWallet.chainId;
  const { amount: usdcStakedRaw } = useAudcStakingPosition(0);
  const { amount: eurcStakedRaw } = useAudcStakingPosition(1);

  const paymentRequest = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return parsePaymentRequest(params);
  }, [searchParams]);

  const [message, setMessage] = useState("");

  const [selectedTab, setSelectedTab] = useState<PayZoneTab>("overview");

    useEffect(() => {
      const tab = searchParams.get("tab");
      if (isPayZoneTab(tab)) startTransition(() => setSelectedTab(tab));
    }, [searchParams]);
  // Arc USDC is the wallet's on-chain balance and the swap pair's USDC asset.
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [eurcBalance, setEurcBalance] = useState("0.00");
  const [usdcBalanceRaw, setUsdcBalanceRaw] = useState<bigint>(BigInt(0));
  const [eurcBalanceRaw, setEurcBalanceRaw] = useState<bigint>(BigInt(0));
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesReady, setBalancesReady] = useState(false);
  const balanceCacheRef = useRef({ address: "", at: 0 });
  const balanceInflightRef = useRef<Promise<void> | null>(null);
  const txBusyRef = useRef(false);
  const lastSwapQuoteKeyRef = useRef("");
  const lastLpQuoteKeyRef = useRef("");

  const [showSendModal, setShowSendModal] = useState(Boolean(paymentRequest));
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [sendAddress, setSendAddress] = useState(paymentRequest?.to ?? "");
  const [sendAmount, setSendAmount] = useState(paymentRequest?.amount ?? "");
  const [sendMemo, setSendMemo] = useState("");
  const [sendAsset, setSendAsset] = useState<"USDC" | "EURC">(paymentRequest?.token === "EURC" ? "EURC" : "USDC");
  const [isSending, setIsSending] = useState(false);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestAsset, setRequestAsset] = useState<"USDC" | "EURC">("USDC");
  const [paymentLink, setPaymentLink] = useState("");

  const [streak, setStreak] = useState(0);
  const [lastCheckInTime, setLastCheckInTime] = useState(0);
  const countdownTick = useSyncExternalStore(subscribeToCountdown, getCountdownSnapshot, () => 0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const [domainSearch, setDomainSearch] = useState("");
  const [domainAvailable, setDomainAvailable] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDomainSuccess, setShowDomainSuccess] = useState(false);
  const [registeredDomain, setRegisteredDomain] = useState("");
  const [registrationHash, setRegistrationHash] = useState("");

  const [txHistory, setTxHistory] = useState<ActivityItem[]>([]);
  const [networkLatency, setNetworkLatency] = useState(0);

  // REAL DEFI VAULT STATES
  const [vaultAsset, setVaultAsset] = useState<"USDC" | "EURC">("USDC");
  const usdcStakedBalance = formatDisplay(usdcStakedRaw, USDC_DECIMALS, 2);
  const eurcStakedBalance = formatDisplay(eurcStakedRaw, EURC_DECIMALS, 2);
  const [liveEurcUsdRate, setLiveEurcUsdRate] = useState<number>(1.09);
  
  const [usdcPendingYield, setUsdcPendingYield] = useState<bigint>(BigInt(0));
  const [eurcPendingYield, setEurcPendingYield] = useState<bigint>(BigInt(0));
  const [usdcClaimable, setUsdcClaimable] = useState<bigint>(BigInt(0));
  const [eurcClaimable, setEurcClaimable] = useState<bigint>(BigInt(0));
  const [usdcClaimed, setUsdcClaimed] = useState<bigint>(BigInt(0));
  const [eurcClaimed, setEurcClaimed] = useState<bigint>(BigInt(0));
  const [usdcRewardLiquidity, setUsdcRewardLiquidity] = useState<bigint>(BigInt(0));
  const [eurcRewardLiquidity, setEurcRewardLiquidity] = useState<bigint>(BigInt(0));

  const [vaultInput, setVaultInput] = useState("");
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [vaultAction, setVaultAction] = useState<"stake"|"withdraw" | null>(null);

  // SWAP STATES
  const [swapInput, setSwapInput] = useState("");
  const [swapDirection, setSwapDirection] = useState<"USDCtoEURC" | "EURCtoUSDC">("USDCtoEURC");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<"approving" | "confirm" | "pending" | null>(null);
  const [swapQuote, setSwapQuote] = useState("");
  const [swapQuoteRaw, setSwapQuoteRaw] = useState<bigint>(BigInt(0));
  const [swapQuoteError, setSwapQuoteError] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showSlippage, setShowSlippage] = useState(false);

  // LP STATES
  const [lpMode, setLpMode] = useState<"add" | "remove">("add");
  const [lpUsdcInput, setLpUsdcInput] = useState("");
  const [lpEurcInput, setLpEurcInput] = useState("");
  const [lpLastEdited, setLpLastEdited] = useState<"usdc" | "eurc">("usdc");
  const [lpRemoveInput, setLpRemoveInput] = useState("");
  const [lpRemoveIsMax, setLpRemoveIsMax] = useState(false);
  const [isLpLoading, setIsLpLoading] = useState(false);
  const [lpAction, setLpAction] = useState<"add" | "remove" | "approve" | null>(null);
  const [lpBalance, setLpBalance] = useState("0.00");
  const [lpBalanceRaw, setLpBalanceRaw] = useState<bigint>(BigInt(0));
  const [lpSharePct, setLpSharePct] = useState("0");
  const [lpPooledUsdc, setLpPooledUsdc] = useState("0.00");
  const [lpPooledEurc, setLpPooledEurc] = useState("0.00");
  const [poolReserveUsdc, setPoolReserveUsdc] = useState("0.00");
  const [poolReserveEurc, setPoolReserveEurc] = useState("0.00");
  const [lpPairAddress, setLpPairAddress] = useState("");
  const [lpRemovePreviewUsdc, setLpRemovePreviewUsdc] = useState("");
  const [lpRemovePreviewEurc, setLpRemovePreviewEurc] = useState("");
  const [lpSlippageBps, setLpSlippageBps] = useState(100);
  const [lpCustomSlippage, setLpCustomSlippage] = useState("");
  const [showLpSlippage, setShowLpSlippage] = useState(false);

  const isArcTestnet = chainId === ARC_CHAIN_ID;

  useEffect(() => {
    txBusyRef.current = isSending || isVaultLoading || isSwapping || isLpLoading;
  }, [isSending, isVaultLoading, isSwapping, isLpLoading]);

  // --- PORTFOLIO CALCULATION LOGIC ---
  const usdcWalletValue = parseFloat(usdcBalance || "0");
  const eurcWalletValue = parseFloat(eurcBalance || "0");
  const uStakedValue = parseFloat(usdcStakedBalance || "0");
  const eStakedValue = parseFloat(eurcStakedBalance || "0");
  
  const totalUsdcValue = usdcWalletValue + uStakedValue;
  const totalEurcValue = eurcWalletValue + eStakedValue; 
  const eurcUsdRate = liveEurcUsdRate; 
  const netWorthUsd = totalUsdcValue + (totalEurcValue * eurcUsdRate);
  
  const usdcPercent = netWorthUsd > 0 ? ((totalUsdcValue / netWorthUsd) * 100).toFixed(0) : "0";
  const eurcPercent = netWorthUsd > 0 ? (((totalEurcValue * eurcUsdRate) / netWorthUsd) * 100).toFixed(0) : "0";

  let totalVolume = 0;
  txHistory.forEach(tx => {
    if(tx.status === "Completed" && tx.amount && tx.amount.startsWith("-")) {
      totalVolume += parseFloat(tx.amount.replace(/[^0-9.]/g, ""));
    }
  });
  // -----------------------------------

  useEffect(() => {
    if (!paymentRequest) return;

    const timer = window.setTimeout(() => {
      setMessage(`Payment Request Received: ${paymentRequest.amount} ${paymentRequest.token}`);
    }, 1500);

    window.history.replaceState({}, document.title, window.location.pathname);
    return () => window.clearTimeout(timer);
  }, [paymentRequest]);

  const addHistoryRecord = (label: string, amount: string, meta: string, status: "Completed" | "Pending" | "Failed", txHash?: string) => {
    setTxHistory((prev) => {
      const newHistory = [{ id: Date.now(), label, amount, meta, status, txHash }, ...prev];
      if (wallet) {
        localStorage.setItem(`arc_payzone_history_${wallet}`, JSON.stringify(newHistory.slice(0, 50)));
      }
      return newHistory;
    });
  };

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4000);
  }, []);

  const applyWalletLocalState = useCallback((newWallet: string) => {
    setRegisteredDomain("");
    setRegistrationHash("");
    setShowDomainSuccess(false);
    setTxHistory([]);
    setUsdcBalance("0.00");
    setEurcBalance("0.00");
    setUsdcBalanceRaw(BigInt(0));
    setEurcBalanceRaw(BigInt(0));
    setBalancesReady(false);
    setLastCheckInTime(0);
    setStreak(0);
    setLpBalance("0.00");
    setLpBalanceRaw(BigInt(0));
    setLpSharePct("0");
    setLpPooledUsdc("0.00");
    setLpPooledEurc("0.00");
    setPoolReserveUsdc("0.00");
    setPoolReserveEurc("0.00");
    setLpPairAddress("");
    balanceCacheRef.current = { address: "", at: 0 };

    const oldDomain = localStorage.getItem(`arc_payzone_domain_name_${newWallet}`);
    if (oldDomain && !localStorage.getItem(`arc_payzone_domain_name_${newWallet}`)) {
      const migratedDomain = oldDomain.replace(".trust", ".arc");
      localStorage.setItem(`arc_payzone_domain_name_${newWallet}`, migratedDomain);
    }

    const oldHistory = localStorage.getItem(`arc_payzone_history_${newWallet}`);
    if (oldHistory && !localStorage.getItem(`arc_payzone_history_${newWallet}`)) {
      localStorage.setItem(`arc_payzone_history_${newWallet}`, oldHistory);
    }

    const myDomain = localStorage.getItem(`arc_payzone_domain_name_${newWallet}`);
    if (myDomain) setRegisteredDomain(myDomain);

    const savedHistory = localStorage.getItem(`arc_payzone_history_${newWallet}`);
    if (savedHistory) setTxHistory(JSON.parse(savedHistory));

  }, []);

  const getEthereum = useCallback(() => {
    return canonicalWallet.provider;
  }, [canonicalWallet.provider]);

  const syncNetwork = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      return currentChainId;
    } catch {
      return null;
    }
  }, [getEthereum]);

  const fetchBalances = useCallback(async (address: string, options?: { force?: boolean }) => {
    if (!address) return;
    const normalized = address.toLowerCase();
    const force = !!options?.force;
    const now = Date.now();

    if (
      !force &&
      balanceCacheRef.current.address === normalized &&
      now - balanceCacheRef.current.at < BALANCE_CACHE_MS
    ) {
      return;
    }

    if (balanceInflightRef.current) {
      await balanceInflightRef.current;
      if (
        !force &&
        balanceCacheRef.current.address === normalized &&
        Date.now() - balanceCacheRef.current.at < BALANCE_CACHE_MS
      ) {
        return;
      }
    }

    const run = async () => {
      const firstLoad = balanceCacheRef.current.address !== normalized;
      if (firstLoad) setBalancesLoading(true);

      try {
        const provider = getArcReadProvider();
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        const eurcContract = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, provider);
        const dailyGmContract = new ethers.Contract(DAILY_GM_ADDRESS, DAILY_GM_ABI, provider);

        try {
          const routerRate = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
          const oneEurc = ethers.parseUnits("1", 6);
          const amounts = await routerRate.getAmountsOut(oneEurc, [EURC_ADDRESS, USDC_ADDRESS]);
          const fetchedRate = parseFloat(ethers.formatUnits(amounts[1], USDC_DECIMALS));
          if (fetchedRate > 0) setLiveEurcUsdRate(fetchedRate);
        } catch (rateError) {
          console.error("Failed to fetch live rate", rateError);
        }

        const start = Date.now();
        const [
          usdcRes,
          eurcRes,
          pairRes,
          lastCheckInRes,
          streakRes,
        ] = await Promise.allSettled([
          usdcContract.balanceOf(address),
          eurcContract.balanceOf(address),
          fetchPairState(provider, EURC_ADDRESS, { force }),
          dailyGmContract.lastCheckIn(address),
          dailyGmContract.streak(address),
        ]);

        setNetworkLatency(Date.now() - start);

        const takeBig = (res: PromiseSettledResult<unknown>): bigint | null =>
          res.status === "fulfilled" && typeof res.value === "bigint" ? res.value : null;

        const usdcRaw = takeBig(usdcRes);
        const eurcRaw = takeBig(eurcRes);
        const pairState = pairRes.status === "fulfilled" ? pairRes.value : undefined;

        if (usdcRaw !== null) {
          setUsdcBalanceRaw(usdcRaw);
          setUsdcBalance(formatDisplay(usdcRaw, USDC_DECIMALS, 2));
        }
        if (eurcRaw !== null) {
          setEurcBalanceRaw(eurcRaw);
          setEurcBalance(formatDisplay(eurcRaw, EURC_DECIMALS, 2));
        }
        if (pairState) {
          setLpPairAddress(pairState.pairAddress);
          setPoolReserveUsdc(formatPretty(pairState.reserveUsdc, USDC_DECIMALS, 4));
          setPoolReserveEurc(formatPretty(pairState.reserveEurc, EURC_DECIMALS, 4));
          const pair = new ethers.Contract(pairState.pairAddress, PAIR_ABI, provider);
          try {
            const lpRaw = (await pair.balanceOf(address)) as bigint;
            setLpBalanceRaw(lpRaw);
            setLpBalance(formatPretty(lpRaw, LP_DECIMALS, 8));
            setLpSharePct(formatSharePercent(lpRaw, pairState.totalSupply));
            const underlying = underlyingFromLp(lpRaw, pairState.totalSupply, pairState.reserveUsdc, pairState.reserveEurc);
            setLpPooledUsdc(formatPretty(underlying.usdc, USDC_DECIMALS, 6));
            setLpPooledEurc(formatPretty(underlying.eurc, EURC_DECIMALS, 6));
          } catch {
            // keep last known LP position
          }
        }

        const lastCheckInRaw = takeBig(lastCheckInRes);
        const streakRaw = takeBig(streakRes);
        if (lastCheckInRaw !== null) {
          const lastTs = Number(lastCheckInRaw);
          setLastCheckInTime(lastTs);
        }
        if (streakRaw !== null) setStreak(Number(streakRaw));

        if (
          usdcRes.status === "fulfilled" ||
          eurcRes.status === "fulfilled" ||
          pairRes.status === "fulfilled"
        ) {
          balanceCacheRef.current = { address: normalized, at: Date.now() };
          setBalancesReady(true);
        }
      } catch (error) {
        console.error("Fetch Balance Error:", error);
      } finally {
        setBalancesLoading(false);
      }
    };

    const pending = run();
    balanceInflightRef.current = pending;
    try {
      await pending;
    } finally {
      if (balanceInflightRef.current === pending) balanceInflightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (wallet) {
      // eslint-disable-next-line react/set-state-in-effect
      applyWalletLocalState(wallet);
      return;
    }

    setRegisteredDomain("");
    setRegistrationHash("");
    setShowDomainSuccess(false);
    setTxHistory([]);
    setUsdcBalance("0.00");
    setEurcBalance("0.00");
    setUsdcBalanceRaw(BigInt(0));
    setEurcBalanceRaw(BigInt(0));
    setBalancesReady(false);
    setLastCheckInTime(0);
    setStreak(0);
    setLpBalance("0.00");
    setLpBalanceRaw(BigInt(0));
    setLpSharePct("0");
    setLpPooledUsdc("0.00");
    setLpPooledEurc("0.00");
    setPoolReserveUsdc("0.00");
    setPoolReserveEurc("0.00");
    setLpPairAddress("");
    balanceCacheRef.current = { address: "", at: 0 };
  }, [applyWalletLocalState, wallet]);

  const hasCheckedInToday = lastCheckInTime > 0 && countdownTick > 0 && countdownTick / 1000 < lastCheckInTime + 86400;

  const timeLeft = (() => {
    if (!hasCheckedInToday || lastCheckInTime <= 0) return "";

    const diff = (lastCheckInTime + 86400) * 1000 - countdownTick;
    if (diff <= 0) return "";

    const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
    const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  })();

  useEffect(() => {
    if (!wallet || !isArcTestnet) return;
    void fetchBalances(wallet);
    const intervalId = setInterval(() => {
      if (txBusyRef.current) return;
      void fetchBalances(wallet);
    }, BALANCE_CACHE_MS);
    return () => clearInterval(intervalId);
  }, [wallet, isArcTestnet, fetchBalances]);

  const switchToArcTestnet = async () => {
    const ethereum = getEthereum();
    if (!ethereum) return false;
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
      await syncNetwork();
      return true;
    } catch (switchError: any) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: ARC_CHAIN_ID_HEX,
            chainName: "Arc Testnet",
            rpcUrls: [ARC_RPC],
            blockExplorerUrls: [ARC_EXPLORER],
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          }],
        });
        await syncNetwork();
        return true;
      } catch (addError) {
        return false;
      }
    }
  };

  const copyAddress = async () => {
    if (!wallet) return showMessage("Connect wallet first");
    await navigator.clipboard.writeText(wallet);
    showMessage("Address copied.");
  };

  const openFaucet = () => window.open(ARC_FAUCET, "_blank", "noopener,noreferrer");
  const openExplorer = () => window.open(ARC_EXPLORER, "_blank", "noopener,noreferrer");
  const openArcWebsite = () => window.open("https://www.arc.io/", "_blank", "noopener,noreferrer");

  const handleOpenSendModal = async () => {
    if (!wallet) return showMessage("Please connect wallet first");
    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return showMessage("Network switch failed. Please switch manually.");
    }
    setIsScanning(false);
    setShowSendModal(true);
  };

  const handleOpenRequestModal = () => {
    if (!wallet) return showMessage("Please connect wallet first");
    setPaymentLink("");
    setRequestAmount("");
    setShowRequestModal(true);
  };

  const generatePaymentLink = () => {
    const parsedAmount = parseAmount(requestAmount, requestAsset === "USDC" ? USDC_DECIMALS : EURC_DECIMALS);
    if (!parsedAmount || parsedAmount <= BigInt(0)) return showMessage("Enter a valid amount");
    
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ to: wallet, amount: requestAmount, token: requestAsset, tab: "send" });
    const link = `${baseUrl}?${params.toString()}`;
    setPaymentLink(link);
    showMessage("Payment link generated!");
  };

  const copyPaymentLink = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    showMessage("Link copied to clipboard.");
  };

  const applyScannedRecipient = (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    let recipient = text;
    if (text.toLowerCase().startsWith("ethereum:")) {
      recipient = text.slice(9).split(/[?@]/)[0];
    } else {
      try {
        const url = new URL(text);
        const to = url.searchParams.get("to");
        if (to) recipient = to;
      } catch {
        // raw address or .arc domain
      }
    }

    recipient = recipient.trim();
    if (!recipient) return;

    if (isBatchMode && sendAddress.trim()) {
      const parts = sendAddress.split(",").map((part) => part.trim()).filter(Boolean);
      const exists = parts.some((part) => part.toLowerCase() === recipient.toLowerCase());
      if (!exists) setSendAddress(`${parts.join(", ")}, ${recipient}`);
    } else {
      setSendAddress(recipient);
    }
    setIsScanning(false);
  };

  const handleSendClick = () => {
    if (!wallet) return showMessage("Please connect wallet first to send");
    if (!sendAddress || !sendAmount) return showMessage("Please fill required fields");
    
    const rawAddresses = isBatchMode ? sendAddress.split(',') : [sendAddress];
    const addresses = rawAddresses.map(a => a.trim()).filter(a => a !== "");

    if (addresses.length === 0) return showMessage("Please enter at least one address");

    const decimals = sendAsset === "USDC" ? USDC_DECIMALS : EURC_DECIMALS;
    const amount = parseAmount(sendAmount, decimals);
    if (!amount || amount <= BigInt(0)) return showMessage("Enter a valid amount");
    const balance = sendAsset === "USDC" ? usdcBalanceRaw : eurcBalanceRaw;
    if (amount * BigInt(addresses.length) > balance) {
      return showMessage(`Insufficient ${sendAsset} balance for this transfer`);
    }
    
    setShowConfirmModal(true); 
  };

  const executeSend = async () => {
    setShowConfirmModal(false); 
    
    const rawAddresses = isBatchMode ? sendAddress.split(',') : [sendAddress];
    const addresses = rawAddresses.map(a => a.trim()).filter(a => a !== "");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return;
    }

    try {
      setIsSending(true);
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet provider unavailable");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const ansContract = new ethers.Contract(ANS_CONTRACT_ADDRESS, ANS_ABI, provider);
      const resolvedAddresses: string[] = [];

      for (let target of addresses) {
        const lowerTarget = target.toLowerCase();
        if (lowerTarget.endsWith(".arc")) {
          showMessage(`Resolving ${target}...`);
          const nameOnly = lowerTarget.replace(/\.arc$/, "");
          try {
             const resolvedAddress = await ansContract.resolve(nameOnly);
             if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
                showMessage(`Domain ${target} is not registered.`);
                setIsSending(false); return;
             }
             resolvedAddresses.push(resolvedAddress);
          } catch (e) {
             showMessage(`Domain ${target} could not be resolved.`);
             setIsSending(false); return;
          }
        } else if (ethers.isAddress(target)) {
          resolvedAddresses.push(target);
        } else {
          showMessage(`Invalid address format: ${target}`);
          setIsSending(false); return;
        }
      }

      const memoHex = sendMemo ? ethers.hexlify(ethers.toUtf8Bytes(sendMemo)) : "0x";
      const memoBytes = sendMemo ? memoHex.replace("0x", "") : "";
      let successCount = 0;

      for (let i = 0; i < resolvedAddresses.length; i++) {
        const currentTarget = resolvedAddresses[i];
        const displayTarget = addresses[i];

        if (i > 0) { showMessage(`Processing transaction ${i + 1} of ${resolvedAddresses.length}...`); await sleep(500); }
        if (isBatchMode) showMessage(`Transaction ${i+1} of ${resolvedAddresses.length}: Please sign in wallet...`);
        else showMessage("Confirm transaction in your wallet...");

        try {
          let tx: any;
          if (sendAsset === "USDC") {
            const parsedAmount = ethers.parseUnits(sendAmount, USDC_DECIMALS);
            const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
            const transferData = contract.interface.encodeFunctionData("transfer", [currentTarget, parsedAmount]);
            const finalData = memoBytes ? transferData + memoBytes : transferData;
            tx = await signer.sendTransaction({ to: USDC_ADDRESS, data: finalData });
          } else {
            const parsedAmount = ethers.parseUnits(sendAmount, 6);
            const contract = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, signer);
            const transferData = contract.interface.encodeFunctionData("transfer", [currentTarget, parsedAmount]);
            const finalData = memoBytes ? transferData + memoBytes : transferData;
            tx = await signer.sendTransaction({ to: EURC_ADDRESS, data: finalData });
          }
          
          showMessage(`Broadcasting ${sendAsset} to network...`);
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) throw new Error("Transfer transaction failed.");
          addHistoryRecord(isBatchMode ? `Batch Transfer ${sendAsset}` : `Transfer ${sendAsset}`, `-${sendAmount} ${sendAsset}`, `To ${displayTarget}${sendMemo ? ` (Memo: ${sendMemo})` : ""}`, "Completed", receipt?.hash || "");
          successCount++;
        } catch (txError) {
          addHistoryRecord(isBatchMode ? `Batch Transfer ${sendAsset}` : `Transfer ${sendAsset}`, `${sendAmount} ${sendAsset}`, `Failed: ${displayTarget}`, "Failed");
        }
      }
      
      if (successCount > 0) {
        showMessage(isBatchMode ? `Batch complete: ${successCount}/${resolvedAddresses.length} sent.` : `Successfully sent ${sendAmount} ${sendAsset}.`);
        setShowSendModal(false); setSendAddress(""); setSendAmount(""); setSendMemo(""); setIsBatchMode(false);
        void fetchBalances(wallet, { force: true });
      } else {
        showMessage(isBatchMode ? `Batch Failed: 0/${resolvedAddresses.length} succeeded.` : `Transaction failed or rejected.`);
      }
    } catch (error) {
      showMessage("Operation failed. Check wallet connection.");
    } finally {
      setIsSending(false);
    }
  };

  // REAL DEFI VAULT EXECUTION LOGIC
  const handleVaultAction = async (action: "stake" | "withdraw") => {
    if (!wallet) return showMessage("Please connect wallet first");
    if (!vaultInput || parseFloat(vaultInput) <= 0) return showMessage("Enter a valid amount");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return;
    }

    setIsVaultLoading(true);
    setVaultAction(action);
    try {
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet provider unavailable");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      let tx;
      let receipt;

      if (vaultAsset === "USDC") {
         const vaultContract = new ethers.Contract(USDC_VAULT_ADDRESS, USDC_VAULT_ABI, signer);
         const amountWei = ethers.parseUnits(vaultInput, ARC_NATIVE_USDC_DECIMALS); 
         const stakedAmount = (await vaultContract.stakedBalance(wallet)) as bigint;
         if (action === "withdraw" && amountWei > stakedAmount) {
           return showMessage("Unstake amount exceeds your live USDC staked balance.");
         }

         if (action === "stake") {
            showMessage("Depositing USDC in progress...");
            tx = await vaultContract.deposit({ value: amountWei });
            receipt = await tx.wait();
            addHistoryRecord("Staked in Vault", `-${vaultInput} USDC`, "Arc PayZone Yield Vault", "Completed", receipt?.hash || "");
            showMessage("USDC staked successfully.");
         } else {
            showMessage("Withdrawing USDC from Vault...");
            tx = await vaultContract.withdraw(amountWei);
            receipt = await tx.wait();
            addHistoryRecord("Withdrew from Vault", `+${vaultInput} USDC`, "Arc PayZone Yield Vault", "Completed", receipt?.hash || "");
            showMessage("USDC withdrawn successfully.");
         }
      } else {
         const vaultContract = new ethers.Contract(EURC_VAULT_ADDRESS, EURC_VAULT_ABI, signer);
         const amountWei = ethers.parseUnits(vaultInput, 6); 
         const stakedAmount = (await vaultContract.stakedBalance(wallet)) as bigint;
         if (action === "withdraw" && amountWei > stakedAmount) {
           return showMessage("Unstake amount exceeds your live EURC staked balance.");
         }

         if (action === "stake") {
            const tokenContract = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, signer);
            const allowance = (await tokenContract.allowance(wallet, EURC_VAULT_ADDRESS)) as bigint;
            if (allowance < amountWei) {
              showMessage("Approving EURC for staking...");
              const approveTx = await tokenContract.approve(EURC_VAULT_ADDRESS, amountWei);
              await approveTx.wait();
            }

            showMessage("Deposit in progress. Confirm in wallet...");
            tx = await vaultContract.deposit(amountWei);
            receipt = await tx.wait();
            addHistoryRecord("Staked in Vault", `-${vaultInput} EURC`, "Arc PayZone Yield Vault", "Completed", receipt?.hash || "");
            showMessage("EURC staked successfully.");
         } else {
            showMessage("Withdrawing EURC from Vault...");
            tx = await vaultContract.withdraw(amountWei);
            receipt = await tx.wait();
            addHistoryRecord("Withdrew from Vault", `+${vaultInput} EURC`, "Arc PayZone Yield Vault", "Completed", receipt?.hash || "");
            showMessage("EURC withdrawn successfully.");
         }
      }
      
      setVaultInput("");
      invalidatePairCache();
      await fetchBalances(wallet, { force: true });

    } catch (error: any) {
      console.error("Vault Error:", error);
      showMessage(error?.reason || "Transaction failed or rejected");
    } finally {
      setIsVaultLoading(false);
      setVaultAction(null);
    }
  };

  const handleClaimReward = async (asset: "USDC" | "EURC") => {
    if (!wallet) return showMessage("Please connect wallet first");
    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return showMessage("Please switch your wallet to Arc Testnet to claim rewards.");
    }

    const adapterAddress = asset === "USDC" ? USDC_CLAIM_ADAPTER_ADDRESS : EURC_CLAIM_ADAPTER_ADDRESS;
    const claimableAmount = asset === "USDC" ? usdcClaimable : eurcClaimable;
    const liquidity = asset === "USDC" ? usdcRewardLiquidity : eurcRewardLiquidity;
    const decimals = asset === "USDC" ? USDC_DECIMALS : EURC_DECIMALS;
    if (!adapterAddress) return showMessage(`${asset} claim adapter is not deployed or configured.`);
    if (claimableAmount === BigInt(0)) return showMessage(`No claimable ${asset} reward.`);
    if (claimableAmount > liquidity) return showMessage(`Insufficient ${asset} reward liquidity.`);
    if (isVaultLoading || isSwapping || isLpLoading || isSending) return;

    setIsVaultLoading(true);
    setVaultAction(null);
    try {
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet provider unavailable");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const adapter = new ethers.Contract(adapterAddress, CLAIM_ADAPTER_ABI, signer);
      const liveClaimable = (await adapter.claimable(wallet)) as bigint;
      const liveLiquidity = (await adapter.rewardLiquidity()) as bigint;
      if (liveClaimable === BigInt(0)) return showMessage(`No claimable ${asset} reward.`);
      if (liveClaimable > liveLiquidity) return showMessage(`Insufficient ${asset} reward liquidity.`);
      showMessage(`Confirm ${asset} claim in your wallet...`);
      const tx = await adapter.claim();
      showMessage(`${asset} claim pending...`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Claim transaction did not return a receipt.");
      await fetchBalances(wallet, { force: true });
      addHistoryRecord(`Claimed ${asset} Rewards`, `+${formatPretty(liveClaimable, decimals, 6)} ${asset}`, `Claim adapter ${receipt.hash}`, "Completed", receipt.hash);
      showMessage(`${asset} claimed. ArcScan: ${ARC_EXPLORER}/tx/${receipt.hash}`);
    } catch (error: unknown) {
      console.error(`${asset} claim error:`, error);
      showMessage(getTxErrorMessage(error));
    } finally {
      setIsVaultLoading(false);
    }
  };

  const ensureTokenAllowance = async (
    token: ethers.Contract,
    owner: string,
    spender: string,
    amount: bigint,
    label: string
  ) => {
    const current = (await token.allowance(owner, spender)) as bigint;
    if (current >= amount) return;
    showMessage(`Approving ${label}...`);
    setSwapStatus("approving");
    setLpAction("approve");
    const approveTx = await token.approve(spender, amount);
    showMessage("Waiting for approval confirmation...");
    const approvalReceipt = await approveTx.wait();
    if (!approvalReceipt || approvalReceipt.status !== 1) throw new Error(`${label} approval failed.`);
    showMessage(`${label} approval confirmed.`);
  };

  const applyCustomSlippage = (raw: string, setter: (bps: number) => void) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    setter(Math.max(1, Math.min(5000, Math.round(n * 100))));
  };

  const fillSwapMax = () => {
    if (swapDirection === "USDCtoEURC") {
      setSwapInput(formatExact(usdcBalanceRaw, USDC_DECIMALS));
    } else {
      setSwapInput(formatExact(eurcBalanceRaw, EURC_DECIMALS));
    }
  };

  const fillLpUsdcMax = () => {
    setLpLastEdited("usdc");
    setLpUsdcInput(formatExact(usdcBalanceRaw, USDC_DECIMALS));
  };

  const fillLpEurcMax = () => {
    setLpLastEdited("eurc");
    setLpEurcInput(formatExact(eurcBalanceRaw, EURC_DECIMALS));
  };

  const fillLpRemoveMax = () => {
    setLpRemoveIsMax(true);
    setLpRemoveInput(formatExact(lpBalanceRaw, LP_DECIMALS));
  };

  const swapAmountIn = parseAmount(swapInput, swapDirection === "USDCtoEURC" ? USDC_DECIMALS : EURC_DECIMALS);
  const swapInsufficient = !!swapAmountIn && (
    swapDirection === "USDCtoEURC"
      ? swapAmountIn > usdcBalanceRaw
      : swapAmountIn > eurcBalanceRaw
  );
  const swapMinOut = swapQuoteRaw > BigInt(0) ? applySlippage(swapQuoteRaw, slippageBps) : BigInt(0);
  const swapUsdcLabel = formatPretty(usdcBalanceRaw, USDC_DECIMALS, 6);
  const swapEurcLabel = formatPretty(eurcBalanceRaw, EURC_DECIMALS, 6);

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      if (!swapInput.trim()) {
        lastSwapQuoteKeyRef.current = "";
        setSwapQuote("");
        setSwapQuoteRaw(BigInt(0));
        setSwapQuoteError("");
        return;
      }

      if (isAmountDraft(swapInput)) return;

      const amountIn = parseAmount(swapInput, swapDirection === "USDCtoEURC" ? USDC_DECIMALS : EURC_DECIMALS);
      if (!amountIn || amountIn <= BigInt(0)) return;

      const quoteKey = `${swapDirection}:${amountIn.toString()}`;
      if (quoteKey === lastSwapQuoteKeyRef.current) return;

      try {
        const provider = getArcReadProvider();
        const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
        const isUsdcIn = swapDirection === "USDCtoEURC";
        const routerFactory = (await router.factory()) as string;
        if (routerFactory.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
          throw new Error("Configured router is not connected to the configured Arc USDC/EURC factory.");
        }
        const path = isUsdcIn ? [USDC_ADDRESS, EURC_ADDRESS] : [EURC_ADDRESS, USDC_ADDRESS];
        const amounts = (await router.getAmountsOut(amountIn, path)) as bigint[];
        const out = amounts[amounts.length - 1];
        if (!cancelled) {
          lastSwapQuoteKeyRef.current = quoteKey;
          setSwapQuoteRaw(out);
          setSwapQuote(formatPretty(out, isUsdcIn ? EURC_DECIMALS : USDC_DECIMALS, isUsdcIn ? 6 : 8));
          setSwapQuoteError("");
        }
      } catch {
        if (!cancelled && lastSwapQuoteKeyRef.current === "") {
          setSwapQuoteError("No quote. Check pool liquidity.");
        }
      }
    };

    const timer = window.setTimeout(() => { void loadQuote(); }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [swapInput, swapDirection]);

  useEffect(() => {
    let cancelled = false;

    const syncOtherSide = async () => {
      if (lpMode !== "add") return;
      const source = lpLastEdited === "usdc" ? lpUsdcInput : lpEurcInput;
      if (!source.trim()) {
        lastLpQuoteKeyRef.current = "";
        if (lpLastEdited === "usdc") setLpEurcInput("");
        else setLpUsdcInput("");
        return;
      }

      if (isAmountDraft(source)) return;

      const parsed = parseAmount(source, lpLastEdited === "usdc" ? USDC_DECIMALS : EURC_DECIMALS);
      if (!parsed || parsed <= BigInt(0)) return;

      const quoteKey = `${lpLastEdited}:${parsed.toString()}`;
      if (quoteKey === lastLpQuoteKeyRef.current) return;

      try {
        const provider = getArcReadProvider();
        const pairState = await fetchPairState(provider, EURC_ADDRESS);
        if (!pairState || pairState.reserveUsdc === BigInt(0) || pairState.reserveEurc === BigInt(0)) return;
        const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
        if (lpLastEdited === "usdc") {
          const quotedEurc = (await router.quote(parsed, pairState.reserveUsdc, pairState.reserveEurc)) as bigint;
          if (!cancelled) {
            lastLpQuoteKeyRef.current = quoteKey;
            setLpEurcInput(formatExact(quotedEurc, EURC_DECIMALS));
          }
        } else {
          const quotedUsdc = (await router.quote(parsed, pairState.reserveEurc, pairState.reserveUsdc)) as bigint;
          if (!cancelled) {
            lastLpQuoteKeyRef.current = quoteKey;
            setLpUsdcInput(formatExact(quotedUsdc, USDC_DECIMALS));
          }
        }
      } catch {}
    };

    const timer = window.setTimeout(() => { void syncOtherSide(); }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lpUsdcInput, lpEurcInput, lpLastEdited, lpMode]);

  useEffect(() => {
    let cancelled = false;

    const previewRemove = async () => {
      const lpAmount = lpRemoveIsMax ? lpBalanceRaw : parseAmount(lpRemoveInput, LP_DECIMALS);
      if (lpMode !== "remove" || !lpRemoveInput.trim()) {
        setLpRemovePreviewUsdc("");
        setLpRemovePreviewEurc("");
        return;
      }
      if (!lpAmount || lpAmount <= BigInt(0)) return;
      try {
        const provider = getArcReadProvider();
        const pairState = await fetchPairState(provider, EURC_ADDRESS);
        if (!pairState) return;
        const underlying = underlyingFromLp(lpAmount, pairState.totalSupply, pairState.reserveUsdc, pairState.reserveEurc);
        if (!cancelled) {
          setLpRemovePreviewUsdc(formatPretty(underlying.usdc, USDC_DECIMALS, 8));
          setLpRemovePreviewEurc(formatPretty(underlying.eurc, EURC_DECIMALS, 6));
        }
      } catch {
        // keep last known remove preview
      }
    };

    const timer = window.setTimeout(() => { void previewRemove(); }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lpRemoveInput, lpMode, lpRemoveIsMax, lpBalanceRaw]);

  const handleSwap = async () => {
    if (!wallet) return showMessage("Please connect wallet first");
    const isUsdcIn = swapDirection === "USDCtoEURC";
    const amountIn = parseAmount(swapInput, isUsdcIn ? USDC_DECIMALS : EURC_DECIMALS);
    if (!amountIn || amountIn <= BigInt(0)) return showMessage("Enter a valid amount");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return showMessage("Please switch to Arc Testnet manually.");
    }

    const readProvider = getArcReadProvider();
    const pairState = await fetchPairState(readProvider, EURC_ADDRESS, { force: true });
    if (!pairState || pairState.reserveUsdc === BigInt(0) || pairState.reserveEurc === BigInt(0)) {
      return showMessage("USDC/EURC pair is unavailable right now.");
    }

    const routerRead = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, readProvider);
    let routerFactory: string;
    try {
      routerFactory = await routerRead.factory();
    } catch (error) {
      return showMessage(`Router validation failed: ${getTxErrorMessage(error)}`);
    }
    if (routerFactory.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
      return showMessage("Configured router is not connected to the configured Arc USDC/EURC factory.");
    }

    if (isUsdcIn && amountIn > usdcBalanceRaw) return showMessage("Insufficient USDC balance");
    if (!isUsdcIn && amountIn > eurcBalanceRaw) return showMessage("Insufficient EURC balance");

    setIsSwapping(true);
    setSwapStatus("confirm");
    try {
      const ethereum = getEthereum();
      if (!ethereum) return showMessage("Wallet not found");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
      const deadline = swapDeadline();
      const path = isUsdcIn ? [USDC_ADDRESS, EURC_ADDRESS] : [EURC_ADDRESS, USDC_ADDRESS];
      const amounts = (await router.getAmountsOut(amountIn, path)) as bigint[];
      const amountOutMin = applySlippage(amounts[amounts.length - 1], slippageBps);
      const inputToken = new ethers.Contract(isUsdcIn ? USDC_ADDRESS : EURC_ADDRESS, TOKEN_ABI, signer);
      await ensureTokenAllowance(inputToken, wallet, ROUTER_ADDRESS, amountIn, isUsdcIn ? "USDC" : "EURC");

      if (isUsdcIn) {
        showMessage("Confirm the USDC to EURC swap in your wallet...");
        const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet, deadline);
        showMessage("Broadcasting Swap...");
        setSwapStatus("pending");
        const receipt = await tx.wait();
        addHistoryRecord("Arc PayZone Swap", `-${formatPretty(amountIn, USDC_DECIMALS, 6)} USDC`, `Min ${formatPretty(amountOutMin, EURC_DECIMALS, 6)} EURC`, "Completed", receipt?.hash || "");
        showMessage("Swap successful.");
      } else {
        showMessage("Confirm the EURC to USDC swap in your wallet...");
        setSwapStatus("confirm");
        const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet, deadline);
        showMessage("Broadcasting Swap...");
        setSwapStatus("pending");
        const receipt = await tx.wait();
        addHistoryRecord("Arc PayZone Swap", `-${formatPretty(amountIn, EURC_DECIMALS, 6)} EURC`, `Min ${formatPretty(amountOutMin, USDC_DECIMALS, 6)} USDC`, "Completed", receipt?.hash || "");
        showMessage("Swap successful.");
      }
      setSwapInput("");
      setSwapQuote("");
      setSwapQuoteRaw(BigInt(0));
      lastSwapQuoteKeyRef.current = "";
      invalidatePairCache();
      void fetchBalances(wallet, { force: true });
    } catch (error: unknown) {
      console.error("Swap Error:", error);
      showMessage(getTxErrorMessage(error));
    } finally {
      setIsSwapping(false);
      setSwapStatus(null);
    }
  };

  const handleAddLiquidity = async () => {
    if (!wallet) return showMessage("Please connect wallet first");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return showMessage("Please switch to Arc Testnet manually.");
    }

    setIsLpLoading(true);
    setLpAction("add");
    try {
      const ethereum = getEthereum();
      if (!ethereum) return showMessage("Wallet not found");
      const readProvider = getArcReadProvider();
      const pairState = await fetchPairState(readProvider, EURC_ADDRESS, { force: true });
      if (!pairState || pairState.reserveUsdc === BigInt(0) || pairState.reserveEurc === BigInt(0)) {
        return showMessage("Pool has no liquidity yet.");
      }

      const routerRead = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, readProvider);
      let amountUsdc: bigint;
      let amountEurc: bigint;

      if (lpLastEdited === "usdc") {
        const parsed = parseAmount(lpUsdcInput, USDC_DECIMALS);
        if (!parsed || parsed <= BigInt(0)) return showMessage("Enter a valid USDC amount");
        amountUsdc = parsed;
        amountEurc = (await routerRead.quote(amountUsdc, pairState.reserveUsdc, pairState.reserveEurc)) as bigint;
      } else {
        const parsed = parseAmount(lpEurcInput, EURC_DECIMALS);
        if (!parsed || parsed <= BigInt(0)) return showMessage("Enter a valid EURC amount");
        amountEurc = parsed;
        amountUsdc = (await routerRead.quote(amountEurc, pairState.reserveEurc, pairState.reserveUsdc)) as bigint;
      }

      if (amountUsdc > usdcBalanceRaw) return showMessage("Insufficient USDC balance");
      if (amountEurc > eurcBalanceRaw) return showMessage("Insufficient EURC balance");

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
      const usdcToken = new ethers.Contract(USDC_ADDRESS, TOKEN_ABI, signer);
      const eurcToken = new ethers.Contract(EURC_ADDRESS, TOKEN_ABI, signer);
      await ensureTokenAllowance(usdcToken, wallet, ROUTER_ADDRESS, amountUsdc, "USDC");
      await ensureTokenAllowance(eurcToken, wallet, ROUTER_ADDRESS, amountEurc, "EURC");

      const amountUsdcMin = applySlippage(amountUsdc, lpSlippageBps);
      const amountEurcMin = applySlippage(amountEurc, lpSlippageBps);

      showMessage("Confirm Add Liquidity in wallet...");
      setLpAction("add");
      const tx = await router.addLiquidity(
        USDC_ADDRESS,
        EURC_ADDRESS,
        amountUsdc,
        amountEurc,
        amountUsdcMin,
        amountEurcMin,
        wallet,
        swapDeadline()
      );
      showMessage("Broadcasting liquidity deposit...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Add liquidity transaction failed.");
      addHistoryRecord(
        "Add Liquidity",
        `-${formatPretty(amountUsdc, USDC_DECIMALS, 6)} USDC / -${formatPretty(amountEurc, EURC_DECIMALS, 6)} EURC`,
        `Min ${slippageLabel(lpSlippageBps)} slippage`,
        "Completed",
        receipt?.hash || ""
      );
      showMessage("Liquidity added.");
      setLpUsdcInput("");
      setLpEurcInput("");
      lastLpQuoteKeyRef.current = "";
      invalidatePairCache();
      await fetchBalances(wallet, { force: true });
    } catch (error: unknown) {
      console.error("Add Liquidity Error:", error);
      showMessage(getTxErrorMessage(error));
    } finally {
      setIsLpLoading(false);
      setLpAction(null);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!wallet) return showMessage("Please connect wallet first");
    const liquidity = lpRemoveIsMax ? lpBalanceRaw : parseAmount(lpRemoveInput, LP_DECIMALS);
    if (!liquidity || liquidity <= BigInt(0)) return showMessage("Enter an LP amount to remove");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return showMessage("Please switch to Arc Testnet manually.");
    }

    if (liquidity > lpBalanceRaw) return showMessage("Insufficient LP token balance");

    setIsLpLoading(true);
    setLpAction("remove");
    try {
      const ethereum = getEthereum();
      if (!ethereum) return showMessage("Wallet not found");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const pairState = await fetchPairState(getArcReadProvider(), EURC_ADDRESS, { force: true });
      if (!pairState) return showMessage("Liquidity pair not found");

      const pair = new ethers.Contract(pairState.pairAddress, PAIR_ABI, signer);
      await ensureTokenAllowance(pair, wallet, ROUTER_ADDRESS, liquidity, "LP tokens");

      const underlying = underlyingFromLp(liquidity, pairState.totalSupply, pairState.reserveUsdc, pairState.reserveEurc);
      const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

      showMessage("Confirm Remove Liquidity in wallet...");
      setLpAction("remove");
      const tx = await router.removeLiquidity(
        USDC_ADDRESS,
        EURC_ADDRESS,
        liquidity,
        applySlippage(underlying.usdc, lpSlippageBps),
        applySlippage(underlying.eurc, lpSlippageBps),
        wallet,
        swapDeadline()
      );
      showMessage("Broadcasting liquidity withdrawal...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Remove liquidity transaction failed.");
      addHistoryRecord(
        "Remove Liquidity",
        `+${formatPretty(applySlippage(underlying.usdc, lpSlippageBps), USDC_DECIMALS, 6)} USDC / +${formatPretty(applySlippage(underlying.eurc, lpSlippageBps), EURC_DECIMALS, 6)} EURC`,
        "USDC/EURC Pool",
        "Completed",
        receipt?.hash || ""
      );
      showMessage("Liquidity removed.");
      setLpRemoveInput("");
      setLpRemoveIsMax(false);
      setLpRemovePreviewUsdc("");
      setLpRemovePreviewEurc("");
      invalidatePairCache();
      await fetchBalances(wallet, { force: true });
    } catch (error: unknown) {
      console.error("Remove Liquidity Error:", error);
      showMessage(getTxErrorMessage(error));
    } finally {
      setIsLpLoading(false);
      setLpAction(null);
    }
  };

  const executeDailyGM = async () => {
    if (!wallet) return showMessage("Please connect wallet first");
    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return;
    }
    if (hasCheckedInToday) return showMessage("Already checked in today! Come back tomorrow.");

    setIsCheckingIn(true);
    try {
      const ethereum = getEthereum();
      if (!ethereum) return showMessage("Wallet not found");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      showMessage("Confirm Daily GM Check-in...");
      const contract = new ethers.Contract(DAILY_GM_ADDRESS, DAILY_GM_ABI, signer);
      const tx = await contract.checkIn();

      showMessage("Broadcasting GM Transaction to Arc Network...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Daily GM transaction failed.");

      showMessage(`Daily GM check-in successful. You are on day ${streak + 1}.`);
      addHistoryRecord("Daily GM Check-in", "", `Streak: day ${streak + 1}`, "Completed", receipt?.hash || "");

      void fetchBalances(wallet, { force: true });
    } catch (error) {
      showMessage("GM Check-in rejected or failed");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSearchDomain = async () => {
    let cleanSearch = domainSearch.trim().toLowerCase();
    cleanSearch = cleanSearch.replace(/\.arc$/, "");
    cleanSearch = cleanSearch.replace(/[^a-z0-9-]/g, '');

    if (!cleanSearch) return showMessage("Enter a valid domain name");
    
    setIsCheckingDomain(true);
    try {
      let provider;
      const eth = getEthereum();
      if (eth) {
        provider = new ethers.BrowserProvider(eth);
      } else {
        provider = new ethers.JsonRpcProvider(ARC_RPC, undefined, { staticNetwork: true });
      }
      
      const ansContract = new ethers.Contract(ANS_CONTRACT_ADDRESS, ANS_ABI, provider);
      const available = await ansContract.isAvailable(cleanSearch);
      
      if (available) {
        setDomainAvailable(true);
        showMessage("Domain is available.");
      } else {
        setDomainAvailable(false);
        showMessage("Domain is already taken! Try another.");
      }
    } catch (error) {
      console.error(error);
      showMessage("Failed to check network. Try again.");
    } finally {
      setIsCheckingDomain(false);
    }
  };

  const triggerConfetti = () => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    script.onload = () => {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100000 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        (window as any).confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        (window as any).confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    };
    document.body.appendChild(script);
  };

  const executeRegisterDomain = async () => {
    if (!wallet) return showMessage("Connect wallet first");

    if (!isArcTestnet) {
      showMessage("Switching to Arc Testnet...");
      const switched = await switchToArcTestnet();
      if (!switched) return;
    }

    try {
      setIsRegistering(true);
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet provider unavailable");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const ansContract = new ethers.Contract(ANS_CONTRACT_ADDRESS, ANS_ABI, signer);
      
      let cleanName = domainSearch.toLowerCase();
      cleanName = cleanName.replace(/\.arc$/, "");
      cleanName = cleanName.replace(/[^a-z0-9-]/g, '');

      showMessage("Confirm Registration in Wallet...");
      
      const tx = await ansContract.register(cleanName);

      showMessage("Registering domain on Arc Network...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Domain registration transaction failed.");

      const newDomain = `${cleanName}.arc`;
      setRegisteredDomain(newDomain);
      setRegistrationHash(receipt?.hash || "");
      
      localStorage.setItem(`arc_payzone_domain_name_${wallet}`, newDomain);

      addHistoryRecord("Arc PayZone Domain Registration", "Free", newDomain, "Completed", receipt?.hash || "");
      
      setShowDomainSuccess(true);
      triggerConfetti();

      setDomainSearch("");
      setDomainAvailable(false);
    } catch (error: any) {
      console.error(error);
      if (error.reason) {
        showMessage(`Registration Failed: ${error.reason}`);
      } else {
        showMessage("Domain registration failed or rejected");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const tc = {
    bgApp: 'bg-background text-foreground',
    textWelcome: 'text-foreground',
    textDesc: 'text-muted-foreground',
    textMain: 'text-foreground',
    textMuted: 'text-muted-foreground',
    solidCardBg: 'border-border bg-card text-card-foreground shadow-xl',
    cardBg: 'border-border bg-card text-card-foreground shadow-xl hover:border-foreground/30',
    actionCard: 'border-border bg-muted text-foreground shadow-md hover:bg-accent hover:border-foreground/30',
    modalBg: 'border-border bg-popover text-popover-foreground shadow-2xl',
    inputBg: 'border-input bg-background text-foreground focus:border-ring',
    innerSurface: theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200',
    innerControl: theme === 'dark' ? 'bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-500 hover:bg-slate-50',
    tabShell: theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200',
    tabInactive: theme === 'dark' ? 'text-slate-300 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-300' : 'text-slate-600 hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-400',
    maxButton: theme === 'dark' ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-amber-300 active:bg-slate-600 disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-amber-500 active:bg-slate-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
    statusCompleted: 'border-border bg-muted text-foreground',
    statusFailed: 'border-destructive/50 bg-destructive text-destructive-foreground',
    statusPending: 'border-border bg-accent text-accent-foreground',
    historyCard: 'border-border bg-card text-card-foreground hover:bg-muted',
    historyText: 'text-muted-foreground',
    footerBg: 'border-border bg-background',
    footerIcon: 'text-muted-foreground border-border bg-muted hover:text-foreground hover:bg-accent',
    primaryButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondaryButton: 'border-border bg-background text-foreground hover:bg-accent',
    accentSurface: 'border-border bg-accent text-accent-foreground',
    accentMutedSurface: 'border-border bg-secondary text-secondary-foreground'
  };

  return (
    <div className={`payzone-theme relative w-full font-sans flex flex-col selection:bg-foreground/20 transition-colors duration-500 overflow-x-hidden ${tc.bgApp}`}>
      
      {message && (
        <div className="fixed top-8 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-white/10 bg-[#0A1A3F]/90 backdrop-blur-xl px-4 py-3 sm:px-8 sm:py-4 shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-500 animate-in fade-in slide-in-from-top-4">
          <div className="font-bold text-xs sm:text-sm tracking-wide text-white whitespace-nowrap">{message}</div>
        </div>
      )}

      {showDomainSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-xl">
          <div className={`relative flex w-full max-w-md flex-col items-center overflow-hidden rounded-[2.5rem] border p-8 text-center shadow-2xl ${tc.modalBg}`}>
            <button type="button" onClick={() => setShowDomainSuccess(false)} className={`absolute top-6 right-6 z-10 rounded-full border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.footerIcon}`} aria-label="Close domain success"><Icons.close className="size-4" /></button>
            <div className={`mb-6 flex h-24 w-24 transform items-center justify-center overflow-hidden rounded-3xl border p-2 transition-transform hover:scale-105 pointer-events-none ${theme === 'dark' ? 'border-cyan-400/30 bg-slate-950' : 'border-cyan-200 bg-slate-50'}`}>
              <Image src="/nexio-logo.png" alt="Arc PayZone Logo" crossOrigin="anonymous" width={96} height={96} className="w-full h-full object-contain rounded-2xl" />
            </div>
            <h2 className={`mb-2 text-3xl font-black tracking-tight ${tc.textMain}`}>Congratulations!</h2>
            <p className={`mb-6 text-sm font-medium ${tc.textMuted}`}>Your domain has been successfully registered, <span className={theme === 'dark' ? 'font-bold text-cyan-300' : 'font-bold text-cyan-700'}>verified on Arc Testnet</span>!</p>
            <div className={`mb-8 inline-flex items-center gap-2 rounded-full border px-6 py-2 pointer-events-none ${tc.actionCard}`}>
              <Icons.sparkles className={`size-4 ${tc.textMain}`} aria-hidden="true" />
              <span className={`text-sm font-black tracking-widest uppercase ${tc.textMain}`}>Lifetime Ownership</span>
            </div>
            <div className={`mb-4 flex w-full items-center justify-between rounded-2xl border p-5 ${theme === 'dark' ? 'border-cyan-400/30 bg-slate-950/80' : 'border-cyan-200 bg-cyan-50'}`}>
              <span className={`text-xl font-black ${tc.textMain}`}>{registeredDomain}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Forever</span>
            </div>
            <div className={`mb-2 flex w-full items-center justify-between rounded-2xl border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
              <span className={`text-xs font-medium ${tc.textMuted}`}>Tx Hash: <span className={`ml-1 ${tc.textMain}`}>{registrationHash.slice(0,6)}...{registrationHash.slice(-4)}</span></span>
              <button onClick={() => window.open(`${ARC_EXPLORER}/tx/${registrationHash}`, "_blank")} className={`flex items-center gap-1 rounded-lg border px-4 py-1.5 text-xs font-bold transition ${tc.maxButton}`}>Open Explorer</button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-[2rem] border p-6 sm:p-8 backdrop-blur-2xl transition-colors duration-300 shadow-[0_0_50px_rgba(6,182,212,0.15)] ${tc.modalBg}`}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>Receive Funds</h3>
              <button type="button" onClick={() => setShowReceiveModal(false)} aria-label="Close receive modal" className={`rounded-full border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.footerIcon}`}><Icons.close className="size-4" /></button>
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className={`rounded-3xl border bg-background p-3 shadow-xl ${tc.modalBg}`}>
                <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${wallet}&color=000000`} alt="Wallet QR Code" width={192} height={192} className="w-48 h-48 rounded-2xl" />
              </div>
              
              <div className="text-center w-full">
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${tc.textMuted}`}>Your Wallet Address</p>
                <div className={`break-all rounded-2xl border p-4 font-mono text-sm ${tc.innerSurface}`}>
                  {wallet}
                </div>
              </div>
              
              <button onClick={copyAddress} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-black transition-all active:scale-95 shadow-xl ${tc.primaryButton}`}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy Address
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[2rem] border p-6 sm:p-8 backdrop-blur-2xl transition-colors duration-300 ${tc.modalBg}`}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>Request Payment</h3>
              <button type="button" onClick={() => setShowRequestModal(false)} aria-label="Close request payment modal" className={`rounded-full border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.footerIcon}`}><Icons.close className="size-4" /></button>
            </div>

            <div className="space-y-5">
              <div>
                <span className={`text-xs font-bold mb-2 block uppercase tracking-widest ${tc.historyText}`}>Select Asset to Receive</span>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setRequestAsset("USDC")} className={`rounded-2xl border-2 py-3 font-black tracking-wide transition-all ${requestAsset === "USDC" ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'}`}>USDC</button>
                  <button onClick={() => setRequestAsset("EURC")} className={`rounded-2xl border-2 py-3 font-black tracking-wide transition-all ${requestAsset === "EURC" ? 'border-border bg-accent text-accent-foreground shadow-sm' : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'}`}>EURC</button>
                </div>
              </div>

              <div>
                <label htmlFor="request-amount" className={`text-xs font-bold mb-2 flex justify-between uppercase tracking-widest ${tc.historyText}`}>
                  <span>Requested Amount</span>
                  <span className="font-mono">Bal: {requestAsset === "USDC" ? usdcBalance : eurcBalance}</span>
                </label>
                <input id="request-amount" type="number" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} placeholder="0.00" className={`w-full rounded-2xl border px-5 py-4 focus:outline-none transition text-2xl font-black ${tc.inputBg}`} />
              </div>

              {!paymentLink ? (
                <button onClick={generatePaymentLink} disabled={!requestAmount} className={`mt-2 w-full rounded-2xl px-5 py-4 text-lg font-black transition-all active:scale-95 disabled:opacity-50 shadow-xl ${tc.primaryButton}`}>
                  Generate Link
                </button>
              ) : (
                <div className={`mt-4 flex flex-col gap-4 rounded-3xl border p-5 animate-in fade-in slide-in-from-bottom-2 ${tc.innerSurface}`}>
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className={`shrink-0 rounded-xl border bg-background p-2 shadow-lg ${tc.modalBg}`}>
                       <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(paymentLink)}&color=000000`} alt="Payment Link QR" width={80} height={80} className="w-20 h-20 rounded-lg" />
                    </div>
                    <div className="flex w-full flex-col text-center sm:text-left">
                       <div className={`mb-1 text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>Scan or Share Link</div>
                       <div className={`break-all rounded-xl border p-2.5 font-mono text-[10px] sm:text-xs ${tc.innerSurface}`}>
                         {paymentLink}
                       </div>
                    </div>
                  </div>
                  
                  <button onClick={copyPaymentLink} className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black transition-all active:scale-95 ${tc.secondaryButton}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Payment Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-[2rem] border p-6 sm:p-8 backdrop-blur-2xl transition-colors duration-300 shadow-[0_0_50px_rgba(6,182,212,0.15)] ${tc.modalBg}`}>
            <div className="text-center mb-6">
              <Icons.warning className="text-muted-foreground mb-4 size-10 animate-pulse" aria-hidden="true" />
              <h3 className={`text-xl font-black mb-2 ${tc.textMain}`}>Confirm Payment</h3>
              <p className={`text-sm ${tc.textMuted}`}>Please verify the details below before sending. Transactions cannot be reversed.</p>
            </div>

            <div className={`mb-6 space-y-3 rounded-2xl border p-4 ${tc.innerSurface}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>Asset</span>
                <span className={`text-lg font-black ${tc.textMain}`}>{sendAmount} {sendAsset}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className={`mt-1 text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>To</span>
                <div className="text-right">
                  {isBatchMode ? (
                    <span className={`text-sm font-mono font-bold ${tc.textMain}`}>{sendAddress.split(',').length} Recipients</span>
                  ) : (
                    <span className={`break-all text-sm font-mono font-bold ${tc.textMain}`}>{sendAddress}</span>
                  )}
                </div>
              </div>
              {sendMemo && (
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>Memo</span>
                  <span className={`text-xs font-medium ${tc.textMuted}`}>{sendMemo}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className={`flex-1 rounded-xl border py-3 font-bold transition-all ${tc.secondaryButton}`}>Cancel</button>
              <button onClick={executeSend} className={`flex-1 rounded-xl py-3 font-black shadow-lg transition-all active:scale-95 ${tc.primaryButton}`}>Confirm & Send</button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[2rem] border p-6 sm:p-8 backdrop-blur-2xl transition-colors duration-300 ${tc.modalBg}`}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>Send Asset</h3>
              <button type="button" aria-label="Close send modal" onClick={() => { setIsScanning(false); setShowSendModal(false); }} className={`rounded-full border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.footerIcon}`}><Icons.close className="size-4" /></button>
            </div>

            <div className={`mb-6 flex items-center justify-between rounded-2xl border p-3 ${tc.innerSurface}`}>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${tc.textMain}`}>Batch Transfer</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`}>v0.7.2 FEATURE</span>
              </div>
              <button type="button" aria-label={isBatchMode ? "Disable batch transfer" : "Enable batch transfer"} onClick={() => setIsBatchMode(!isBatchMode)} className={`relative h-6 w-12 rounded-full transition-colors ${isBatchMode ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform ${isBatchMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor={isBatchMode ? "send-address-batch" : "send-address"} className={`text-xs font-bold mb-2 flex justify-between items-center uppercase tracking-widest ${tc.historyText}`}>
                  <span className="flex items-center gap-2">
                    Recipient {isBatchMode ? "Addresses or names" : "Address or name"}
                    <button
                      type="button"
                      aria-label={isScanning ? "Close QR scanner" : "Open QR scanner"}
                      onClick={() => setIsScanning((prev) => !prev)}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-black normal-case tracking-wide transition-all ${
                        isScanning
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {isScanning ? "Close" : "Scan QR"}
                    </button>
                  </span>
                  {isBatchMode && <span className={`text-[9px] ${tc.textMuted}`}>Separate with comma (,)</span>}
                </label>
                {isScanning && (
                  <div className={`mb-3 overflow-hidden rounded-2xl border ${tc.innerSurface}`}>
                    <QrScanner
                      onScan={(detected: IDetectedBarcode[]) => {
                        const text = detected?.[0]?.rawValue;
                        if (text) applyScannedRecipient(text);
                      }}
                      onError={(error) => {
                        if (error?.kind === "permission-denied") showMessage("Camera permission denied");
                        else if (error?.kind === "no-camera") showMessage("No camera found");
                        else if (error?.message) showMessage(error.message);
                      }}
                      constraints={{ facingMode: "environment" }}
                      formats={["qr_code"]}
                      sound={false}
                      styles={{ container: { width: "100%" } }}
                    />
                  </div>
                )}
                {isBatchMode ? (
                  <textarea id="send-address-batch" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="0x1..., jubayir.arc, 0x3..." className={`w-full rounded-2xl border px-5 py-4 focus:outline-none transition font-mono text-sm resize-none h-24 ${tc.inputBg}`} />
                ) : (
                  <input id="send-address" type="text" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="e.g., 0x... or jubayir.arc" className={`w-full rounded-2xl border px-5 py-4 focus:outline-none transition font-mono text-sm ${tc.inputBg}`} />
                )}
              </div>
              <div>
                <span className={`text-xs font-bold mb-2 block uppercase tracking-widest ${tc.historyText}`}>Select Asset</span>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setSendAsset("USDC")} className={`rounded-2xl border-2 py-3 font-black tracking-wide transition-all ${sendAsset === "USDC" ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'}`}>USDC</button>
                  <button onClick={() => setSendAsset("EURC")} className={`rounded-2xl border-2 py-3 font-black tracking-wide transition-all ${sendAsset === "EURC" ? 'border-border bg-accent text-accent-foreground shadow-sm' : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'}`}>EURC</button>
                </div>
              </div>
              <div>
                <label htmlFor="send-amount" className={`text-xs font-bold mb-2 flex justify-between uppercase tracking-widest ${tc.historyText}`}>
                  <span>Amount {isBatchMode && "(Per address)"}</span>
                  <span className="font-mono">Bal: {sendAsset === "USDC" ? usdcBalance : eurcBalance}</span>
                </label>
                <input id="send-amount" type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className={`w-full rounded-2xl border px-5 py-4 focus:outline-none transition text-2xl font-black ${tc.inputBg}`} />
              </div>
              
              <div>
                <label htmlFor="send-memo" className={`text-xs font-bold mb-2 flex justify-between uppercase tracking-widest ${tc.historyText}`}>
                  <span>Tx Memo</span>
                  <span className={`rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] ${tc.accentMutedSurface}`}>v0.7.2 FEATURE</span>
                </label>
                <input id="send-memo" type="text" value={sendMemo} onChange={(e) => setSendMemo(e.target.value)} placeholder="Optional (e.g. Invoice #123)" className={`w-full rounded-2xl border px-5 py-3 focus:outline-none transition text-sm ${tc.inputBg}`} />
              </div>

              <button onClick={handleSendClick} disabled={isSending || !sendAddress || !sendAmount} className={`mt-2 w-full rounded-2xl px-5 py-4 text-lg font-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-xl ${tc.primaryButton}`}>
                {isSending ? "Processing..." : `Send ${sendAsset}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full px-4 py-6 md:py-10 md:px-10 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-8 md:gap-10">
          
          <div className="text-center space-y-3 md:space-y-4">
            <h1 className={`text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter pb-2 ${tc.textMain}`}>
              Welcome to Arc PayZone
            </h1>
            <p className={`text-sm md:text-lg font-medium tracking-wide max-w-xl mx-auto px-2 ${tc.textMuted}`}>
              Enterprise-grade stablecoin management built on the lightning-fast Arc L1 Network.
            </p>
          </div>

          <div className="w-full">
            {selectedTab === "overview" && (
              <div className="space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <div className={`rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group transition-all duration-500 md:hover:-translate-y-1 ${tc.cardBg}`}>
                    <Icons.creditCard className="absolute -top-6 -right-6 size-28 opacity-[0.03] transition-opacity duration-700 group-hover:opacity-[0.08] md:-top-10 md:-right-10 md:size-36" aria-hidden="true" />
                    <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>USDC Balance</div>
                    <div className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter drop-shadow-sm">{!balancesReady && balancesLoading ? "..." : usdcBalance}</div>
                  </div>

                  <div className={`rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group transition-all duration-500 md:hover:-translate-y-1 ${tc.cardBg}`}>
                    <Icons.creditCard className="absolute -top-6 -right-6 size-28 opacity-[0.03] transition-opacity duration-700 group-hover:opacity-[0.08] md:-top-10 md:-right-10 md:size-36" aria-hidden="true" />
                    <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>EURC Balance</div>
                    <div className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter drop-shadow-sm">{!balancesReady && balancesLoading ? "..." : eurcBalance}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
                  <button onClick={handleOpenSendModal} className={`group rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 text-center transition-all md:hover:-translate-y-2 flex flex-col items-center justify-center ${tc.actionCard}`}>
                    <div className="text-sm sm:text-lg md:text-xl font-black group-hover:scale-105 transition-transform tracking-wide">Send</div>
                    <span className={`text-[8px] mt-1 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>BATCH (v0.7.2)</span>
                  </button>
                  
                  <button onClick={handleOpenRequestModal} className={`group rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 text-center transition-all md:hover:-translate-y-2 flex flex-col items-center justify-center relative ${tc.actionCard}`}>
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 w-2 h-2 rounded-full bg-cyan-500 animate-pulse pointer-events-none"></div>
                    <div className="text-sm sm:text-lg md:text-xl font-black group-hover:scale-105 transition-transform tracking-wide">Request</div>
                    <span className={`text-[8px] mt-1 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>PAYMENT LINK</span>
                  </button>

                  <button onClick={() => {
                    if(!wallet) return showMessage("Connect wallet first");
                    setShowReceiveModal(true);
                  }} className={`group rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 text-center transition-all md:hover:-translate-y-2 flex flex-col items-center justify-center ${tc.actionCard}`}>
                    <div className="text-sm sm:text-lg md:text-xl font-black group-hover:scale-105 transition-transform tracking-wide">Receive</div>
                    <span className={`text-[8px] mt-1 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>QR CODE PAY</span>
                  </button>

                  <button onClick={openFaucet} className={`group rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 text-center transition-all md:hover:-translate-y-2 flex flex-col items-center justify-center ${tc.actionCard}`}>
                    <div className="text-sm sm:text-lg md:text-xl font-black group-hover:scale-105 transition-transform tracking-wide">Faucet</div>
                    <span className={`text-[8px] mt-1 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>FREE TESTNET</span>
                  </button>
                </div>
              </div>
            )}

            {/* REAL PORTFOLIO & DEFI TAB CONTENT */}
            {selectedTab === "portfolio" && (
              <div className="w-full max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">
                
                {/* 100% Real Portfolio Header */}
                <div className={`p-8 md:p-10 rounded-[2rem] border transition-all duration-500 ${tc.solidCardBg}`}>
                  <div className="flex flex-col items-center text-center">
                    <span className={`text-sm font-bold tracking-widest uppercase mb-4 ${tc.textMuted}`}>Total Net Worth</span>
                    <div className={`text-5xl sm:text-6xl font-black tracking-tighter mb-2 ${tc.textMain}`}>
                      ${!balancesReady && balancesLoading ? "..." : netWorthUsd.toFixed(2)}
                    </div>
                    <span className={`text-xs font-bold tracking-widest uppercase mb-6 ${tc.textMuted}`}>Based on live data (1 EURC approximately ${liveEurcUsdRate.toFixed(4)})</span>
                  </div>
                </div>

                <AudcStakingPanel theme={theme} />

                <div className='hidden'>
                {/* Legacy external-vault UI retained temporarily for migration compatibility. */}
                {/* 100% REAL DEFI VAULT STAKING SECTION */}
                <div className={`rounded-3xl md:rounded-[2rem] border p-6 md:p-8 relative overflow-hidden transition-all shadow-[0_0_40px_rgba(16,185,129,0.1)] ${theme === 'dark' ? 'bg-gradient-to-br from-[#0A1A3F] to-emerald-950/30 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'}`}>
                  <Icons.sparkles className={`absolute top-4 right-4 size-14 pointer-events-none ${theme === 'dark' ? 'opacity-10' : 'opacity-[0.05]'}`} aria-hidden="true" />
                  
                  <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${tc.textMuted}`}>
                    <span>Arc PayZone DeFi Vault</span>
                    <div className="flex gap-2 p-1 rounded-lg bg-black/20 border border-white/5 relative z-10">
                      <button onClick={() => setVaultAsset("USDC")} className={`px-4 py-1.5 rounded-md transition-colors ${vaultAsset === "USDC" ? "bg-cyan-500 text-white shadow-sm" : "hover:bg-white/10"}`}>USDC</button>
                      <button onClick={() => setVaultAsset("EURC")} className={`px-4 py-1.5 rounded-md transition-colors ${vaultAsset === "EURC" ? "bg-emerald-500 text-white shadow-sm" : "hover:bg-white/10"}`}>EURC</button>
                    </div>
                  </div>

                  <div className="flex flex-col mb-8 gap-1 relative z-10">
                     <div className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>Your Staked Balance</div>
                     <div className={`text-4xl md:text-5xl font-black tracking-tighter ${vaultAsset === "USDC" ? (theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600') : (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')}`}>
                       {vaultAsset === "USDC" ? usdcStakedBalance : eurcStakedBalance} <span className="text-xl md:text-2xl text-gray-500">{vaultAsset}</span>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 relative z-10">
                     <div className="relative w-full">
                       <input
                         type="number"
                         value={vaultInput}
                         onChange={(e) => setVaultInput(e.target.value)}
                         placeholder="0.00"
                         className={`w-full rounded-xl border px-4 py-3 focus:outline-none transition font-bold text-lg ${tc.inputBg}`}
                       />
                       <button 
                         onClick={() => setVaultInput(vaultAsset === "USDC" ? usdcBalance : eurcBalance)}
                         className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-black uppercase rounded bg-white/10 hover:bg-white/20 transition-colors ${tc.textMain}`}
                       >
                         Max
                       </button>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                       <button
                         onClick={() => handleVaultAction("stake")}
                         disabled={isVaultLoading || !vaultInput}
                         className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-base transition-all shadow-md text-white flex justify-center items-center gap-2 disabled:opacity-50 ${vaultAsset === "USDC" ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-emerald-500 hover:bg-emerald-400'} active:scale-95`}
                       >
                           {isVaultLoading && vaultAction === 'stake' ? 'STAKING...' : 'STAKE'}
                       </button>
                       <button
                         onClick={() => handleVaultAction("withdraw")}
                         disabled={isVaultLoading || !vaultInput}
                         className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-base transition-all border-2 shadow-sm flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 ${vaultAsset === "USDC" ? (theme === 'dark' ? 'bg-cyan-950/60 border-cyan-300 text-cyan-100 hover:bg-cyan-900/80' : 'bg-white border-cyan-600 text-cyan-800 hover:bg-cyan-50') : (theme === 'dark' ? 'bg-emerald-950/60 border-emerald-300 text-emerald-100 hover:bg-emerald-900/80' : 'bg-white border-emerald-600 text-emerald-800 hover:bg-emerald-50')}`}
                       >
                         {isVaultLoading && vaultAction === 'withdraw' ? 'UNSTAKING...' : 'UNSTAKE'}
                       </button>
                     </div>
                  </div>
                  <div className={`text-[10px] mt-4 text-center font-bold ${tc.textMuted}`}>Contract: {vaultAsset === "USDC" ? USDC_VAULT_ADDRESS : EURC_VAULT_ADDRESS}</div>
                </div>

                {/* SAME-TOKEN VAULT REWARDS */}
                <div className={`rounded-3xl md:rounded-[2rem] border p-6 md:p-8 relative overflow-hidden transition-all shadow-xl ${theme === 'dark' ? 'bg-gradient-to-br from-[#0A1A3F] to-indigo-950/40 border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200'}`}>
                  <Icons.adjustments className={`absolute top-4 right-4 size-14 pointer-events-none ${theme === 'dark' ? 'opacity-10' : 'opacity-[0.05]'}`} aria-hidden="true" />
                  
                  <div className="mb-6 max-w-[80%] relative z-10">
                    <h3 className={`text-xl md:text-2xl font-black tracking-tight mb-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>Vault Rewards</h3>
                     <p className={`text-xs md:text-sm font-medium leading-relaxed ${tc.textMuted}`}>
                      Rewards are read directly from the selected vault and remain denominated in the staked token.
                     </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-black/20 p-5 rounded-2xl border border-white/5 relative z-10">
                     <div className="flex flex-col gap-4 w-full">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>{vaultAsset} Pending</span>
                           <span className={`text-xl font-black ${tc.textMain}`}>{formatPretty(vaultAsset === "USDC" ? usdcPendingYield : eurcPendingYield, ARC_NATIVE_USDC_DECIMALS, 6)} {vaultAsset}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                          <span className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>{vaultAsset} Claimable</span>
                          <span className={`text-2xl font-black text-indigo-400 animate-pulse`}>{formatPretty(vaultAsset === "USDC" ? usdcClaimable : eurcClaimable, vaultAsset === "USDC" ? USDC_DECIMALS : EURC_DECIMALS, 6)} {vaultAsset}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                          <span className={`text-xs font-bold uppercase tracking-widest ${tc.textMuted}`}>Claimed {vaultAsset}</span>
                          <span className={`text-sm font-black ${tc.textMain}`}>{formatPretty(vaultAsset === "USDC" ? usdcClaimed : eurcClaimed, vaultAsset === "USDC" ? USDC_DECIMALS : EURC_DECIMALS, 6)} {vaultAsset}</span>
                        </div>
                     </div>

                      <button
                        onClick={() => handleClaimReward(vaultAsset)}
                        disabled={
                          !wallet ||
                          !isArcTestnet ||
                          isVaultLoading ||
                          (vaultAsset === "USDC"
                            ? !USDC_CLAIM_ADAPTER_ADDRESS || usdcClaimable === BigInt(0) || usdcClaimable > usdcRewardLiquidity
                            : !EURC_CLAIM_ADAPTER_ADDRESS || eurcClaimable === BigInt(0) || eurcClaimable > eurcRewardLiquidity)
                        }
                        className={`w-full sm:w-auto px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:shadow-none active:scale-95 ${theme === 'dark' ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {isVaultLoading ? 'CLAIMING...' : `CLAIM ${vaultAsset}`}
                      </button>
                  </div>
                  <p className={`text-[10px] mt-4 text-center font-bold ${tc.textMuted}`}>
                    {!((vaultAsset === "USDC" ? USDC_CLAIM_ADAPTER_ADDRESS : EURC_CLAIM_ADAPTER_ADDRESS))
                      ? `Claim unavailable: ${vaultAsset} claim adapter is not deployed/configured.`
                      : (vaultAsset === "USDC" ? usdcClaimable > usdcRewardLiquidity : eurcClaimable > eurcRewardLiquidity)
                        ? `Reward contract has insufficient ${vaultAsset} liquidity.`
                        : `Rewards are paid in ${vaultAsset} by the funded claim adapter.`}
                  </p>
                </div>

                </div>

                {/* 100% Real Assets List */}
                <div className={`p-8 md:p-10 rounded-[2rem] border transition-all duration-500 ${tc.solidCardBg}`}>
                  <span className={`text-sm font-bold tracking-widest uppercase mb-6 block ${tc.textMuted}`}>Your Assets</span>
                  
                  <div className="space-y-4">
                    {/* USDC */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-500/20">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] pointer-events-none"></div>
                        <span className={`text-lg font-black uppercase tracking-wider ${tc.textMain}`}>USDC</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${tc.textMain}`}>{usdcBalance} <span className="text-sm">USDC</span></div>
                        <div className={`text-xs font-medium mt-1 ${tc.textMuted}`}>${usdcWalletValue.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Staked USDC */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-500/20">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full border-2 border-cyan-500 bg-transparent shadow-[0_0_10px_rgba(6,182,212,0.5)] pointer-events-none"></div>
                        <span className={`text-lg font-black uppercase tracking-wider ${tc.textMain}`}>USDC <span className={`ml-1 text-[10px] ${tc.textMuted}`}>STAKED</span></span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${tc.textMain}`}>{usdcStakedBalance} <span className="text-sm">USDC</span></div>
                        <div className={`text-xs font-medium mt-1 ${tc.textMuted}`}>${uStakedValue.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {/* EURC */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-500/20">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] pointer-events-none"></div>
                        <span className={`text-lg font-black uppercase tracking-wider ${tc.textMain}`}>EURC</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${tc.textMain}`}>{eurcBalance} <span className="text-sm">EURC</span></div>
                        <div className={`text-xs font-medium mt-1 ${tc.textMuted}`}>${(eurcWalletValue * eurcUsdRate).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Staked EURC */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-500/20">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)] pointer-events-none"></div>
                        <span className={`text-lg font-black uppercase tracking-wider ${tc.textMain}`}>EURC <span className={`ml-1 text-[10px] ${tc.textMuted}`}>STAKED</span></span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${tc.textMain}`}>{eurcStakedBalance} <span className="text-sm">EURC</span></div>
                        <div className={`text-xs font-medium mt-1 ${tc.textMuted}`}>${(eStakedValue * eurcUsdRate).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Other */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-gray-500 pointer-events-none"></div>
                        <span className={`text-lg font-black uppercase tracking-wider ${tc.textMain}`}>Other</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${tc.textMain}`}>0.00</div>
                        <div className={`text-xs font-medium mt-1 ${tc.textMuted}`}>$0.00</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 100% Real Asset Allocation Bar */}
                <div className={`p-8 md:p-10 rounded-[2rem] border transition-all duration-500 ${tc.solidCardBg}`}>
                  <span className={`text-sm font-bold tracking-widest uppercase mb-6 block ${tc.textMuted}`}>Asset Allocation (Inc. Staked)</span>
                  
                  <div className="w-full">
                    <div className={`w-full h-4 md:h-6 rounded-full overflow-hidden flex border shadow-inner mb-5 ${theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-gray-200 border-gray-300'}`}>
                      <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${usdcPercent}%` }}></div>
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${eurcPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm font-black">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 pointer-events-none"></div>
                        <span className={tc.textMain}>USDC <span className={tc.textMuted}>({usdcPercent}%)</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={tc.textMain}><span className={tc.textMuted}>({eurcPercent}%)</span> EURC</span>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {selectedTab === "send" && (
              <div className={`mx-auto w-full max-w-2xl rounded-3xl p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500 ${tc.solidCardBg}`}>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-[0.2em] ${tc.textMuted}`}>Arc Testnet payments</div>
                    <h2 className={`mt-2 text-3xl font-black tracking-tight ${tc.textMain}`}>Send USDC or EURC</h2>
                    <p className={`mt-3 max-w-xl text-sm leading-relaxed ${tc.textMuted}`}>
                      Send supported Arc Testnet assets to a wallet address or registered .arc name. Every transfer is reviewed in your wallet and recorded only after a successful receipt.
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-3 py-2 text-xs font-black ${tc.innerSurface}`}>Network: Arc Testnet</div>
                </div>
                <div className={`mt-8 grid gap-3 sm:grid-cols-2 ${tc.innerSurface} rounded-2xl border p-4`}>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-widest ${tc.textMuted}`}>USDC available</div>
                    <div className={`mt-1 text-xl font-black ${tc.textMain}`}>{wallet ? usdcBalance : 'Connect wallet'}{wallet && ' USDC'}</div>
                  </div>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-widest ${tc.textMuted}`}>EURC available</div>
                    <div className={`mt-1 text-xl font-black ${tc.textMain}`}>{wallet ? eurcBalance : 'Connect wallet'}{wallet && ' EURC'}</div>
                  </div>
                </div>
                <button type='button' onClick={() => void handleOpenSendModal()} className={`mt-6 w-full rounded-2xl px-5 py-4 text-lg font-black transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.primaryButton}`}>
                  {wallet ? 'Open Send Form' : 'Connect Wallet to Send'}
                </button>
                <p className={`mt-4 text-center text-xs ${tc.textMuted}`}>USDC and EURC use their verified 6-decimal ERC-20 transfer paths.</p>
              </div>
            )}

            {selectedTab === "request" && (
              <div className={`mx-auto w-full max-w-2xl rounded-3xl p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500 ${tc.solidCardBg}`}>
                <div className={`text-xs font-black uppercase tracking-[0.2em] ${tc.textMuted}`}>Shareable payment requests</div>
                <h2 className={`mt-2 text-3xl font-black tracking-tight ${tc.textMain}`}>Request payment</h2>
                <p className={`mt-3 text-sm leading-relaxed ${tc.textMuted}`}>Create a link for USDC or EURC. Opening the link only prefills Send; it never submits a transaction automatically.</p>
                {!wallet ? (
                  <div className={`mt-8 rounded-2xl border p-5 text-center ${tc.innerSurface}`}>
                    <p className={`text-sm ${tc.textMuted}`}>Connect your wallet to create a request addressed to you.</p>
                    <button type='button' onClick={() => canonicalWallet.connect()} className='mt-4 rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>Connect Wallet</button>
                  </div>
                ) : (
                  <button type='button' onClick={handleOpenRequestModal} className={`mt-8 w-full rounded-2xl px-5 py-4 text-lg font-black transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.primaryButton}`}>Create Payment Request</button>
                )}
                {paymentLink && selectedTab === "request" && (
                  <div className={`mt-6 rounded-2xl border p-4 ${tc.innerSurface}`}>
                    <p className={`break-all text-xs font-mono ${tc.textMain}`}>{paymentLink}</p>
                    <button type='button' onClick={copyPaymentLink} className={`mt-4 rounded-xl border border-border bg-background px-4 py-2 text-sm font-black text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.secondaryButton}`}>Copy Link</button>
                  </div>
                )}
              </div>
            )}

            {selectedTab === "receive" && (
              <div className={`mx-auto w-full max-w-2xl rounded-3xl border p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500 ${tc.solidCardBg}`}>
                <div className={`text-xs font-black uppercase tracking-[0.2em] ${tc.textMuted}`}>Arc Testnet receiving</div>
                <h2 className={`mt-2 text-3xl font-black tracking-tight ${tc.textMain}`}>Receive USDC or EURC</h2>
                <p className={`mt-3 text-sm leading-relaxed ${tc.textMuted}`}>Send USDC or EURC on Arc Testnet to this wallet address.</p>

                {!wallet ? (
                  <div className={`mt-8 rounded-2xl border p-5 text-center ${tc.innerSurface}`}>
                    <p className={`text-sm ${tc.textMuted}`}>Connect your wallet to display your receiving address and QR code.</p>
                    <button
                      type="button"
                      onClick={() => canonicalWallet.connect()}
                      className={`mt-4 rounded-xl px-5 py-3 font-black transition ${tc.primaryButton}`}
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`mt-8 flex justify-center rounded-3xl border p-5 ${tc.innerSurface}`}>
                      <div className="rounded-2xl bg-white p-3 shadow-xl">
                        <Image
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(wallet)}&color=000000`}
                          alt="QR code for wallet address"
                          width={192}
                          height={192}
                          className="size-48 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className={`mt-5 rounded-2xl border p-4 text-center font-mono text-sm break-all ${tc.innerSurface}`}>{wallet}</div>
                    <button type='button' onClick={copyAddress} className={`mt-4 w-full rounded-2xl px-5 py-4 font-black transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.primaryButton}`}>Copy Wallet Address</button>
                  </>
                )}
              </div>
            )}

            {selectedTab === "faucet" && (
              <div className={`mx-auto w-full max-w-2xl rounded-3xl p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500 ${tc.solidCardBg}`}>
                <div className={`text-xs font-black uppercase tracking-[0.2em] ${tc.textMuted}`}>Testnet utility</div>
                <h2 className={`mt-2 text-3xl font-black tracking-tight ${tc.textMain}`}>Arc Testnet Faucet</h2>
                <p className={`mt-3 text-sm leading-relaxed ${tc.textMuted}`}>Use the official Circle faucet to request testnet assets for Arc Testnet. PayZone never automates faucet claims or asks for wallet credentials.</p>
                <div className={`mt-8 rounded-2xl border p-5 ${tc.innerSurface}`}>
                  <div className={`text-sm font-black ${tc.textMain}`}>Network</div>
                  <div className={`mt-1 text-sm ${tc.textMuted}`}>Arc Testnet - Chain ID {ARC_CHAIN_ID}</div>
                  {wallet && <div className={`mt-4 break-all font-mono text-xs ${tc.textMuted}`}>Wallet: {wallet}</div>}
                </div>
                <a href={ARC_FAUCET} target='_blank' rel='noopener noreferrer' className={`mt-6 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-lg font-black transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tc.primaryButton}`}>Open Official Circle Faucet</a>
              </div>
            )}

            {selectedTab === "swap" && (
              <div className="w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 mt-2 md:mt-6">
                 <div className={`p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] border shadow-2xl relative overflow-hidden ${tc.solidCardBg}`}>
                    <div className="flex items-start justify-between gap-3 mb-6 relative z-10">
                       <div>
                          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${tc.textMain}`}>Swap</h2>
                          <p className={`text-[10px] sm:text-xs mt-1 font-bold uppercase tracking-widest ${tc.textMuted}`}>USDC / EURC - 18-decimal USDC</p>
                       </div>
                       <button
                         onClick={() => setShowSlippage((v) => !v)}
                         className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                       >
                         Slip {slippageLabel(slippageBps)}
                       </button>
                    </div>

                    {showSlippage && (
                      <div className={`mb-5 p-3 rounded-2xl border relative z-10 ${tc.innerSurface}`}>
                         <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${tc.textMuted}`}>Max slippage</div>
                         <div className="flex flex-wrap gap-2">
                            {SLIPPAGE_PRESETS.map((bps) => (
                              <button key={bps} onClick={() => { setSlippageBps(bps); setCustomSlippage(""); }} className={`px-3 py-1.5 rounded-xl text-xs font-black ${slippageBps === bps && !customSlippage ? "bg-cyan-500 text-white" : tc.tabInactive}`}>
                                {slippageLabel(bps)}
                              </button>
                            ))}
                            <input
                              type="number"
                              inputMode="decimal"
                              value={customSlippage}
                              onChange={(e) => { setCustomSlippage(e.target.value); applyCustomSlippage(e.target.value, setSlippageBps); }}
                              placeholder="Custom %"
                              className={`w-24 rounded-xl border px-3 py-1.5 text-xs font-bold ${tc.inputBg}`}
                            />
                         </div>
                      </div>
                    )}

                      <div className={`p-1 rounded-2xl flex gap-1 mb-5 border relative z-10 ${tc.tabShell}`}>
                        <button onClick={() => setSwapDirection("USDCtoEURC")} className={`flex-1 py-3 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all ${swapDirection === "USDCtoEURC" ? "bg-cyan-500 text-white shadow-lg" : tc.tabInactive}`}>USDC to EURC</button>
                        <button onClick={() => setSwapDirection("EURCtoUSDC")} className={`flex-1 py-3 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all ${swapDirection === "EURCtoUSDC" ? "bg-emerald-500 text-white shadow-lg" : tc.tabInactive}`}>EURC to USDC</button>
                    </div>

                    <div className="space-y-3 relative z-10">
                       <div className={`rounded-2xl border p-4 ${tc.innerSurface}`}>
                         <div className="flex justify-between items-center mb-2">
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`}>You Pay</span>
                           <span className={`text-[10px] font-bold ${tc.textMuted}`}>Bal {swapDirection === "USDCtoEURC" ? swapUsdcLabel : swapEurcLabel}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="text" inputMode="decimal" value={swapInput} onChange={(e) => setSwapInput(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" className={`flex-1 min-w-0 bg-transparent border-none outline-none font-black text-2xl sm:text-3xl placeholder:text-muted-foreground ${tc.textMain}`} />
                           <div className="flex items-center gap-2 shrink-0">
                             <span className={`text-sm font-black ${tc.textMain}`}>{swapDirection === "USDCtoEURC" ? "USDC" : "EURC"}</span>
                             <button onClick={fillSwapMax} className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase transition-colors ${tc.maxButton}`}>Max</button>
                           </div>
                         </div>
                       </div>

                       <div className="flex justify-center -my-1 relative z-10">
                         <div className={`flex size-9 items-center justify-center rounded-full border text-sm ${theme === 'dark' ? 'bg-[#0A1A3F] border-white/10' : 'bg-white border-slate-200'}`}><Icons.chevronDown className="size-4" aria-hidden="true" /></div>
                       </div>

                       <div className={`rounded-2xl border p-4 ${tc.innerSurface}`}>
                         <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${tc.textMuted}`}>You Receive</div>
                         <div className="flex items-end justify-between gap-2">
                           <div className={`font-black text-2xl sm:text-3xl break-all ${tc.textMain}`}>
                             {swapQuote || "0.00"}
                           </div>
                           <span className={`text-sm font-black shrink-0 ${tc.textMuted}`}>{swapDirection === "USDCtoEURC" ? "EURC" : "USDC"}</span>
                         </div>
                         {swapQuoteRaw > BigInt(0) && (
                           <div className={`text-[10px] font-bold mt-2 ${tc.textMuted}`}>
                             Min received ({slippageLabel(slippageBps)}): {formatPretty(swapMinOut, swapDirection === "USDCtoEURC" ? EURC_DECIMALS : USDC_DECIMALS, 6)}
                           </div>
                         )}
                         {swapQuoteError && <div className="text-[10px] font-bold mt-2 text-red-400">{swapQuoteError}</div>}
                       </div>

                       <button
                         onClick={wallet ? handleSwap : undefined}
                         disabled={!wallet || isSwapping || !swapAmountIn || !!swapQuoteError || swapInsufficient}
                         className={`w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${swapDirection === "USDCtoEURC" ? 'bg-cyan-500 hover:bg-cyan-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
                       >
                         {!wallet
                           ? "Connect in header"
                           : isSwapping
                             ? (swapStatus === "approving" ? "Approving EURC..." : swapStatus === "pending" ? "Pending..." : "Confirm in Wallet...")
                             : swapInsufficient
                               ? "Insufficient Balance"
                               : "Swap"}
                       </button>
                    </div>
                    
                    <div className={`text-[10px] mt-5 text-center font-bold tracking-widest ${tc.textMuted}`}>Router {ROUTER_ADDRESS.slice(0,6)}...{ROUTER_ADDRESS.slice(-4)}</div>
                 </div>
              </div>
            )}

            {selectedTab === "lp" && (
              <div className="w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 mt-2 md:mt-6">
                 <div className={`p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] border shadow-2xl relative overflow-hidden ${tc.solidCardBg}`}>
                    <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
                       <div>
                          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${tc.textMain}`}>Liquidity</h2>
                          <p className={`text-[10px] sm:text-xs mt-1 font-bold uppercase tracking-widest ${tc.textMuted}`}>USDC / EURC Pool</p>
                       </div>
                       <button
                         onClick={() => setShowLpSlippage((v) => !v)}
                         className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                       >
                         Slip {slippageLabel(lpSlippageBps)}
                       </button>
                    </div>

                    {showLpSlippage && (
                      <div className={`mb-5 p-3 rounded-2xl border relative z-10 ${tc.innerSurface}`}>
                         <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${tc.textMuted}`}>Max slippage</div>
                         <div className="flex flex-wrap gap-2">
                            {SLIPPAGE_PRESETS.map((bps) => (
                              <button key={bps} onClick={() => { setLpSlippageBps(bps); setLpCustomSlippage(""); }} className={`px-3 py-1.5 rounded-xl text-xs font-black ${lpSlippageBps === bps && !lpCustomSlippage ? "bg-cyan-500 text-white" : tc.tabInactive}`}>
                                {slippageLabel(bps)}
                              </button>
                            ))}
                            <input
                              type="number"
                              inputMode="decimal"
                              value={lpCustomSlippage}
                              onChange={(e) => { setLpCustomSlippage(e.target.value); applyCustomSlippage(e.target.value, setLpSlippageBps); }}
                              placeholder="Custom %"
                              className={`w-24 rounded-xl border px-3 py-1.5 text-xs font-bold ${tc.inputBg}`}
                            />
                         </div>
                      </div>
                    )}

                    <div className={`p-4 rounded-2xl border mb-5 relative z-10 ${tc.innerSurface}`}>
                       <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${tc.textMuted}`}>Your Position</div>
                       <div className="grid grid-cols-2 gap-3">
                          <div>
                             <div className={`text-[10px] font-bold uppercase ${tc.textMuted}`}>LP Tokens</div>
                             <div className={`text-base sm:text-lg font-black break-all ${tc.textMain}`}>{!balancesReady && balancesLoading ? "..." : lpBalance}</div>
                          </div>
                          <div className="text-right">
                             <div className={`text-[10px] font-bold uppercase ${tc.textMuted}`}>Pool Share</div>
                             <div className={`text-base sm:text-lg font-black ${tc.textMain}`}>{lpSharePct}%</div>
                          </div>
                          <div>
                             <div className={`text-[10px] font-bold uppercase ${tc.textMuted}`}>Pooled USDC</div>
                             <div className={`text-sm font-black break-all ${tc.textMain}`}>{lpPooledUsdc}</div>
                          </div>
                          <div className="text-right">
                             <div className={`text-[10px] font-bold uppercase ${tc.textMuted}`}>Pooled EURC</div>
                             <div className={`text-sm font-black break-all ${tc.textMain}`}>{lpPooledEurc}</div>
                          </div>
                       </div>
                       <div className={`flex justify-between mt-3 pt-3 border-t text-[10px] font-bold ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} ${tc.textMuted}`}>
                          <span>Wallet USDC</span>
                          <span className={tc.textMain}>{formatPretty(usdcBalanceRaw, USDC_DECIMALS, 6)}</span>
                       </div>
                    </div>

                      <div className={`p-1 rounded-2xl flex gap-1 mb-5 border relative z-10 ${tc.tabShell}`}>
                        <button onClick={() => setLpMode("add")} className={`flex-1 py-3 rounded-xl font-black text-sm tracking-wide transition-all ${lpMode === "add" ? "bg-cyan-500 text-white shadow-lg" : tc.tabInactive}`}>Add</button>
                        <button onClick={() => setLpMode("remove")} className={`flex-1 py-3 rounded-xl font-black text-sm tracking-wide transition-all ${lpMode === "remove" ? "bg-emerald-500 text-white shadow-lg" : tc.tabInactive}`}>Remove</button>
                    </div>

                    {lpMode === "add" ? (
                      <div className="space-y-3 relative z-10">
                         <div className={`rounded-2xl border p-4 ${tc.innerSurface}`}>
                           <div className="flex justify-between mb-2">
                             <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`}>USDC</span>
                             <span className={`text-[10px] font-bold ${tc.textMuted}`}>Bal {swapUsdcLabel}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <input type="text" inputMode="decimal" value={lpUsdcInput} onChange={(e) => { setLpLastEdited("usdc"); setLpUsdcInput(e.target.value.replace(/[^\d.]/g, "")); }} placeholder="0.00" className={`flex-1 min-w-0 bg-transparent outline-none font-black text-xl sm:text-2xl placeholder:text-muted-foreground ${tc.textMain}`} />
                             <button onClick={fillLpUsdcMax} className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase transition-colors ${tc.maxButton}`}>Max</button>
                           </div>
                         </div>
                         <div className={`rounded-2xl border p-4 ${tc.innerSurface}`}>
                           <div className="flex justify-between mb-2">
                             <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`}>EURC</span>
                             <span className={`text-[10px] font-bold ${tc.textMuted}`}>Bal {swapEurcLabel}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <input type="text" inputMode="decimal" value={lpEurcInput} onChange={(e) => { setLpLastEdited("eurc"); setLpEurcInput(e.target.value.replace(/[^\d.]/g, "")); }} placeholder="0.00" className={`flex-1 min-w-0 bg-transparent outline-none font-black text-xl sm:text-2xl placeholder:text-muted-foreground ${tc.textMain}`} />
                             <button onClick={fillLpEurcMax} className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase transition-colors ${tc.maxButton}`}>Max</button>
                           </div>
                         </div>
                         <div className={`text-[10px] font-bold text-center ${tc.textMuted}`}>
                           Pool {poolReserveUsdc} USDC / {poolReserveEurc} EURC - Min {slippageLabel(lpSlippageBps)}
                         </div>
                         <button
                           onClick={wallet ? handleAddLiquidity : undefined}
                           disabled={!!wallet && (isLpLoading || !parseAmount(lpUsdcInput, USDC_DECIMALS) || !parseAmount(lpEurcInput, EURC_DECIMALS))}
                           className="w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 bg-cyan-500 hover:bg-cyan-400 text-white"
                         >
                           {!wallet
                             ? "Connect in header"
                             : isLpLoading
                               ? (lpAction === "approve" ? "Approving EURC..." : "Adding Liquidity...")
                               : ((parseAmount(lpUsdcInput, USDC_DECIMALS) ?? BigInt(0)) > usdcBalanceRaw || (parseAmount(lpEurcInput, EURC_DECIMALS) ?? BigInt(0)) > eurcBalanceRaw
                                   ? "Insufficient Balance"
                                   : "Add Liquidity")}
                         </button>
                      </div>
                    ) : (
                      <div className="space-y-3 relative z-10">
                         <div className={`rounded-2xl border p-4 ${tc.innerSurface}`}>
                           <div className="flex justify-between mb-2">
                             <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`}>LP to remove</span>
                             <span className={`text-[10px] font-bold ${tc.textMuted}`}>Bal {lpBalance}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <input type="text" inputMode="decimal" value={lpRemoveInput} onChange={(e) => { setLpRemoveIsMax(false); setLpRemoveInput(e.target.value.replace(/[^\d.]/g, "")); }} placeholder="0.00" className={`flex-1 min-w-0 bg-transparent outline-none font-black text-xl sm:text-2xl placeholder:text-muted-foreground ${tc.textMain}`} />
                             <button onClick={fillLpRemoveMax} className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase transition-colors ${tc.maxButton}`}>Max</button>
                           </div>
                         </div>
                         <div className={`p-4 rounded-2xl border ${tc.innerSurface}`}>
                           <div className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${tc.textMuted}`}>You receive (est.)</div>
                           <div className={`text-base font-black ${tc.textMain}`}>{lpRemovePreviewUsdc || "0.00"} <span className="text-sm text-gray-500">USDC</span></div>
                           <div className={`text-base font-black mt-1 ${tc.textMain}`}>{lpRemovePreviewEurc || "0.00"} <span className="text-sm text-gray-500">EURC</span></div>
                           {lpRemovePreviewUsdc && (
                             <div className={`text-[10px] font-bold mt-2 ${tc.textMuted}`}>Mins use {slippageLabel(lpSlippageBps)} slippage</div>
                           )}
                         </div>
                         <button
                           onClick={wallet ? handleRemoveLiquidity : undefined}
                           disabled={!!wallet && (isLpLoading || (!lpRemoveIsMax && !parseAmount(lpRemoveInput, LP_DECIMALS)))}
                           className="w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 bg-emerald-500 hover:bg-emerald-400 text-white"
                         >
                           {!wallet
                             ? "Connect in header"
                             : isLpLoading
                               ? (lpAction === "approve" ? "Approving LP..." : "Removing Liquidity...")
                               : ((!lpRemoveIsMax && (parseAmount(lpRemoveInput, LP_DECIMALS) ?? BigInt(0)) > lpBalanceRaw)
                                   ? "Insufficient LP Balance"
                                   : "Remove Liquidity")}
                         </button>
                      </div>
                    )}

                    <div className={`text-[10px] mt-5 text-center font-bold tracking-widest space-y-1 ${tc.textMuted}`}>
                       <div>Router {ROUTER_ADDRESS.slice(0,6)}...{ROUTER_ADDRESS.slice(-4)}</div>
                       <div>Factory {FACTORY_ADDRESS.slice(0,6)}...{FACTORY_ADDRESS.slice(-4)}</div>
                    </div>
                 </div>
              </div>
            )}

            {selectedTab === "dailygm" && (
              <div className="w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 mt-4 md:mt-10">
                <div className={`w-full max-w-2xl rounded-3xl md:rounded-[3rem] border p-8 md:p-14 shadow-2xl flex flex-col items-center text-center relative overflow-hidden group gap-6 md:gap-8 ${theme === 'dark' ? 'border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-black backdrop-blur-2xl text-white' : 'border-orange-200 bg-gradient-to-br from-orange-50 to-white text-slate-900'}`}>
                  <Icons.sun className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 opacity-5 transition-transform duration-1000 group-hover:rotate-12 md:size-80" aria-hidden="true" />
                  
                  <div className="flex flex-col items-center z-10">
                     {hasCheckedInToday ? <Icons.sparkles className="mb-4 size-16 animate-bounce" aria-hidden="true" /> : <Icons.clock className="mb-4 size-16 animate-bounce" aria-hidden="true" />}
                     <h3 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">Daily GM Protocol</h3>
                     <p className={`text-sm md:text-base font-medium max-w-md ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Establish your presence on the Arc L1 Network. Execute a zero-value smart contract transaction to build your immutable on-chain streak!</p>
                  </div>
                  
                  <div className="flex flex-col w-full items-center gap-4 z-10 mt-4">
                     <div className='text-xl md:text-2xl font-black uppercase tracking-widest px-8 py-3 rounded-full border border-border bg-primary text-primary-foreground shadow-inner'>
                        {streak > 0 ? `Current Streak: ${streak} Days` : "No Streak Yet"}
                     </div>
                     <button 
                        aria-label={hasCheckedInToday ? "Daily GM already checked in" : "Check in for Daily GM"}
                        onClick={executeDailyGM}
                        disabled={isCheckingIn || hasCheckedInToday || !wallet}
                        className={`w-full max-w-sm rounded-2xl py-4 md:py-5 font-black text-lg md:text-xl transition-all duration-300 shadow-2xl mt-4 ${
                           hasCheckedInToday 
                              ? (theme === 'dark' ? "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed") 
                              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-md"
                        }`}
                     >
                        {isCheckingIn ? "Signing Transaction..." : hasCheckedInToday ? `Next GM in: ${timeLeft}` : "Say GM (Check-in)"}
                     </button>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === "domains" && (
              <div className={`relative overflow-hidden rounded-3xl p-6 animate-in fade-in zoom-in-95 duration-500 md:rounded-[2.5rem] md:p-10 ${tc.solidCardBg}`}>
                <Icons.externalLink className={`absolute top-0 right-0 size-28 pointer-events-none ${theme === 'dark' ? 'opacity-5' : 'opacity-[0.03]'}`} aria-hidden="true" />
                <h2 className={`text-2xl md:text-4xl font-black tracking-tight mb-2 md:mb-3 ${tc.textMain}`}>Arc PayZone Web3 Identity</h2>
                <p className={`text-xs md:text-base font-medium mb-6 md:mb-10 max-w-xl ${tc.textMuted}`}>Register your unique <span className={theme === 'dark' ? 'text-cyan-400 font-bold' : 'text-cyan-600 font-bold'}>.arc</span> username on the blockchain and establish your lifetime identity.</p>

                <div className='flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full bg-card border border-border rounded-3xl sm:rounded-full p-2 pl-4 md:pl-6 transition-shadow relative z-10 shadow-md hover:shadow-lg'>
                  <span className={`hidden sm:inline-block text-xl font-bold ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`} aria-hidden="true">.arc</span>
                  <input
                    type="text"
                    value={domainSearch}
                    onChange={(event) => setDomainSearch(event.target.value)}
                    placeholder="Search your .arc name"
                    aria-label="Search for a domain name"
                    className='flex-1 min-w-0 bg-transparent text-card-foreground text-base font-semibold placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-lg'
                  />
                  <button
                    type="button"
                    onClick={handleSearchDomain}
                    disabled={isCheckingDomain || !domainSearch.trim()}
                    className={`w-full rounded-full px-6 py-2.5 text-sm font-black transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400 sm:w-auto md:px-8 md:py-3.5 md:text-lg ${theme === 'dark' ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-cyan-500 text-white shadow-md hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-500'}`}
                  >
                    {isCheckingDomain ? 'Checking...' : 'Check Availability'}
                  </button>
                </div>

                {domainSearch.trim() && (
                  <div className={`mt-4 text-sm md:text-base font-bold ${theme === 'dark' ? 'text-cyan-300' : 'text-cyan-700'}`}>
                    {domainAvailable ? `${domainSearch.trim()}.arc is available` : 'That name is already taken or unavailable'}
                  </div>
                )}

                {domainAvailable && (
                  <div className={`mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border p-4 md:mt-8 md:p-5 sm:flex-row ${tc.innerSurface}`}>
                    <div>
                      <div className={`text-xs md:text-sm uppercase tracking-[0.18em] font-black ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>Available domain</div>
                      <div className={`text-lg md:text-2xl font-black ${tc.textMain}`}>{domainSearch.trim()}.arc</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Register selected domain"
                      onClick={executeRegisterDomain}
                      disabled={isRegistering}
                      className={`w-full rounded-full px-6 py-2.5 text-sm font-black transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400 sm:w-auto md:px-8 md:py-3.5 md:text-lg ${theme === 'dark' ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-cyan-500 text-white shadow-md hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-500'}`}
                    >
                      {isRegistering ? 'Registering...' : 'Register Now'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedTab === "history" && (
              <div className={`rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 animate-in fade-in duration-500 ${tc.solidCardBg}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-10">
                  <div>
                    <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${tc.textMain}`}>Local Activity</h2>
                    <p className={`text-xs md:text-sm font-semibold mt-1 md:mt-2 ${tc.textMuted}`}>
                      Wallet action feed for app-local events and pending transactions; authoritative on-chain history is shown in the dedicated Transactions page.
                    </p>
                  </div>
                  <button onClick={openExplorer} className={`w-full rounded-full border px-6 py-2.5 text-xs font-black tracking-wide transition-all active:scale-95 shadow-sm sm:w-auto md:px-8 md:py-3 md:text-sm ${tc.maxButton}`}>
                    Open Arc Explorer
                  </button>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  {txHistory.length === 0 ? (
                    <div className="text-center py-10 md:py-20">
                      <Icons.clock className="mb-3 size-14 opacity-50 md:mb-4 md:size-16" aria-hidden="true" />
                      <div className={`font-bold text-base md:text-lg ${tc.textMuted}`}>No blockchain activity found.</div>
                    </div>
                  ) : (
                    txHistory.map((item) => (
                      <div key={item.id} className={`rounded-xl md:rounded-2xl border p-4 md:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 md:gap-6 transition-all ${tc.historyCard}`}>
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className={`rounded-full border p-3 md:p-4 ${item.status === "Completed" ? tc.statusCompleted : item.status === "Failed" ? tc.statusFailed : tc.statusPending}`}>
                            {item.status === "Completed" ? <Icons.check className="size-5" aria-hidden="true" /> : item.status === "Failed" ? <Icons.close className="size-5" aria-hidden="true" /> : <Icons.clock className="size-5" aria-hidden="true" />}
                          </div>
                          <div>
                            <div className={`font-black text-lg md:text-xl tracking-tight leading-tight ${tc.textMain}`}>{item.label}</div>
                            {item.txHash ? (
                              <a href={`${ARC_EXPLORER}/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className={`mt-1 md:mt-1.5 text-xs md:text-sm font-bold underline underline-offset-4 flex items-center gap-1 md:gap-1.5 transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-500'}`}>
                                <span className="truncate max-w-[150px] sm:max-w-none">{item.meta}</span> <Icons.externalLink className="size-3 shrink-0" aria-hidden="true" />
                              </a>
                            ) : (
                              <div className={`mt-1 md:mt-1.5 text-xs md:text-sm font-bold ${tc.textMuted}`}>{item.meta}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="sm:text-right pl-14 md:pl-20 sm:pl-0 flex flex-col items-start sm:items-end">
                          {item.amount && (
                            <div className={`font-black text-xl md:text-2xl tracking-tighter ${item.amount.startsWith("+") ? (theme==='dark'?'text-emerald-400':'text-emerald-600') : item.amount.startsWith("-") ? tc.textMain : tc.textMuted}`}>
                              {item.amount}
                            </div>
                          )}
                          <div className={`mt-1.5 inline-block rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest md:mt-2 md:px-3 ${item.status === "Completed" ? tc.statusCompleted : item.status === "Failed" ? tc.statusFailed : tc.statusPending}`}>
                            {item.status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedTab === "learn" && (
              <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
                <section className={`relative overflow-hidden rounded-3xl border p-6 md:rounded-[2rem] md:p-10 ${tc.solidCardBg}`}>
                  <Icons.info className="text-muted-foreground/20 absolute -right-5 -top-5 size-32" aria-hidden="true" />
                  <div className="relative max-w-3xl">
                    <div className={`mb-3 text-xs font-black uppercase tracking-[0.2em] ${tc.textMuted}`}>Product overview</div>
                    <h2 className={`text-3xl font-black tracking-tight md:text-5xl ${tc.textMain}`}>About ARC PayZone</h2>
                    <p className={`mt-5 text-sm leading-7 md:text-base ${tc.textDesc}`}>
                      ARC PayZone is a unified interface for managing stablecoin payments, wallet activity, on-chain utilities, and Web3 identity on Arc. It brings everyday payment actions and DeFi tools into one focused workspace, designed to make on-chain money movement easier to understand and easier to use.
                    </p>
                    <p className={`mt-4 text-sm leading-7 ${tc.textMuted}`}>
                      From sending and receiving assets to creating payment requests, managing liquidity, resolving .arc identities, and tracking activity, ARC PayZone connects the core pieces of an on-chain payment workflow in one place.
                    </p>
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>One Workspace. Multiple Payment Workflows.</h3>
                    <p className={`mt-2 max-w-3xl text-sm leading-6 ${tc.textMuted}`}>
                      The main dashboard provides the operational view of your activity, while ARC PayZone brings the payment and on-chain tools together in a dedicated workspace. The result is a single environment for monitoring activity, moving assets, creating requests, managing liquidity, and exploring Arc-native utilities.
                    </p>
                  </div>
                </section>

                <div className="space-y-8">
                  {aboutGroups.map((group) => (
                    <section key={group.title} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-black tracking-tight ${tc.textMain}`}>{group.title}</h3>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className={`grid gap-4 ${group.cards.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl'}`}>
                        {group.cards.map((card) => {
                          const CardIcon = card.icon;
                          return (
                            <article key={card.title} className={`rounded-2xl border p-5 ${tc.innerSurface}`}>
                              <CardIcon className="mb-4 size-5 text-primary" aria-hidden="true" />
                              <h4 className={`text-base font-bold ${tc.textMain}`}>{card.title}</h4>
                              <p className={`mt-2 text-sm leading-6 ${tc.textMuted}`}>{card.description}</p>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                <section className={`rounded-3xl border p-6 md:p-8 ${tc.solidCardBg}`}>
                  <div className="max-w-3xl">
                    <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>Designed Around the Way You Move Value</h3>
                    <p className={`mt-3 text-sm leading-7 ${tc.textMuted}`}>
                      ARC PayZone connects the steps that usually live in separate tools. Discover your balance, choose an asset, send or request a payment, receive through a shareable address, move between supported assets, provide liquidity, and review activity without leaving the same workspace.
                    </p>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-5">
                    {[
                      ['Overview', Icons.dashboard],
                      ['Choose Asset', Icons.creditCard],
                      ['Send / Request / Receive', Icons.send],
                      ['Manage / Swap / Liquidity', Icons.adjustments],
                      ['Review Activity', Icons.clock]
                    ].map(([label, StepIcon], index) => {
                      const IconComponent = StepIcon as Icon;
                      return (
                        <div key={label as string} className="relative flex items-center gap-3 rounded-xl border bg-muted/40 p-3 sm:block sm:text-center">
                          <IconComponent className="size-5 shrink-0 text-primary sm:mx-auto sm:mb-2" aria-hidden="true" />
                          <span className={`text-xs font-semibold ${tc.textMain}`}>{label as string}</span>
                          {index < 4 && <Icons.chevronRight className="text-muted-foreground absolute -right-3 hidden size-4 sm:block" aria-hidden="true" />}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={`rounded-3xl border p-6 md:p-8 ${tc.solidCardBg}`}>
                  <div className="max-w-3xl">
                    <Icons.post className="mb-4 size-6 text-primary" aria-hidden="true" />
                    <h3 className={`text-2xl font-black tracking-tight ${tc.textMain}`}>Built on Arc Network</h3>
                    <p className={`mt-3 text-sm leading-7 ${tc.textMuted}`}>
                      ARC PayZone is designed around Arc's stablecoin-focused blockchain environment, giving the platform a foundation for on-chain payments, asset movement, and decentralized financial workflows. PayZone builds the product experience above that infrastructure so the underlying network can feel simpler from the user's perspective.
                    </p>
                    <button type="button" onClick={openArcWebsite} className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto ${tc.primaryButton}`}>
                      Visit Arc Official Website
                      <Icons.externalLink className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className={`mt-auto border-t border-border/80 py-3.5 backdrop-blur-xl transition-colors duration-500 ${tc.footerBg}`}>
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:px-6 md:flex-row">
          <div className={`text-[10px] font-bold uppercase tracking-[0.22em] text-center md:text-left ${tc.textMuted}`}>
            © 2026 ARC PAYZONE • BUILT ON ARC NETWORK
          </div>

          <div className="flex flex-col items-center gap-1.5 md:items-end">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${tc.textMuted}`}>
              BUILT BY SHAKIL AHMED
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            <a aria-label="GitHub" title="GitHub" href="https://github.com/yuda0x" target="_blank" rel="noopener noreferrer" className={`inline-flex size-8 items-center justify-center rounded-full border transition-colors duration-200 ${tc.footerIcon}`}>
              <Icons.github className="h-3.5 w-3.5" />
            </a>
            <a aria-label="X" title="X" href="https://x.com/0xqorii" target="_blank" rel="noopener noreferrer" className={`inline-flex size-8 items-center justify-center rounded-full border transition-colors duration-200 ${tc.footerIcon}`}>
              <Icons.twitter className="h-3.5 w-3.5" />
            </a>
            <a aria-label="LinkedIn" title="LinkedIn" href="https://www.linkedin.com/in/bdshakil/" target="_blank" rel="noopener noreferrer" className={`inline-flex size-8 items-center justify-center rounded-full border transition-colors duration-200 ${tc.footerIcon}`}>
              <Icons.linkedin className="h-3.5 w-3.5" />
            </a>
            <a aria-label="Telegram" title="Telegram" href="https://t.me/shakilhossain69" target="_blank" rel="noopener noreferrer" className={`inline-flex size-8 items-center justify-center rounded-full border transition-colors duration-200 ${tc.footerIcon}`}>
              <Icons.telegram className="h-3.5 w-3.5" />
            </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

