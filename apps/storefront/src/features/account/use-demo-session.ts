"use client";

import { useEffect, useState } from "react";

import { readDemoSession, subscribeToDemoSession, type DemoAccount } from "./demo-accounts";

interface DemoSessionState {
  account: DemoAccount | null;
  ready: boolean;
}

export function useDemoSession(): DemoSessionState {
  const [state, setState] = useState<DemoSessionState>({ account: null, ready: false });

  useEffect(() => {
    const sync = () => setState({ account: readDemoSession(), ready: true });
    sync();
    return subscribeToDemoSession(sync);
  }, []);

  return state;
}
