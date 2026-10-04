"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cx, linkActionClass } from "@/components/ui/styles";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setFailed(true);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cx(linkActionClass, "self-start disabled:opacity-50")}
      >
        Log out
      </button>
      {failed && (
        <p role="alert" className="text-xs font-semibold text-danger">
          Could not sign out. Try again.
        </p>
      )}
    </>
  );
}
