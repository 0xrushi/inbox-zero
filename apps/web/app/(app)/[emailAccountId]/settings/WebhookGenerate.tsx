"use client";

import { Button } from "@/components/ui/button";
import { regenerateWebhookSecretAction } from "@/utils/actions/webhook";
import { toastError, toastSuccess } from "@/components/Toast";
import { useAccount } from "@/providers/EmailAccountProvider";
import { useAction } from "next-safe-action/hooks";

export function RegenerateSecretButton({ hasSecret }: { hasSecret: boolean }) {
  const { emailAccountId } = useAccount();
  const { execute, isExecuting } = useAction(
    regenerateWebhookSecretAction.bind(null, emailAccountId),
    {
      onSuccess: () => {
        toastSuccess({
          description: "Webhook secret regenerated",
        });
      },
      onError: (error) => {
        toastError({
          description:
            error.error.serverError ??
            "An unknown error occurred while regenerating the webhook secret",
        });
      },
    },
  );

  return (
    <Button variant="outline" loading={isExecuting} onClick={() => execute()}>
      {hasSecret ? "Regenerate Secret" : "Generate Secret"}
    </Button>
  );
}
