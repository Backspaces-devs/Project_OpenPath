"use client";

import { useEffect, useRef } from "react";

/**
 * Progressive enhancement for the server-rendered filter form: submits it the
 * moment a control changes. Without JS the form still works via its Apply button.
 */
export function AutoSubmit({ formId }: { formId: string }) {
  const attached = useRef(false);

  useEffect(() => {
    if (attached.current) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    attached.current = true;

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      // Let the visitor finish typing in free-text fields.
      if (target instanceof HTMLInputElement && target.type === "text") return;
      form.requestSubmit();
    };

    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [formId]);

  return null;
}
