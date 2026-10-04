import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cx, primaryButtonClass } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not found" />
      <Card>
        <p className="text-muted">We could not find what you were looking for.</p>
        <Link href="/" className={cx(primaryButtonClass, "self-start")}>
          Back to Home
        </Link>
      </Card>
    </>
  );
}
