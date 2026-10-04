"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="inline-flex min-h-11 cursor-pointer items-center self-start px-1 text-sm font-semibold text-brand hover:text-brand-hover"
    >
      Log out
    </button>
  );
}
