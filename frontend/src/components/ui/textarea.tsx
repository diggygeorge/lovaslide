import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
   HTMLTextAreaElement,
   React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
   return (
      <textarea
         ref={ref}
         className={cn(
            "flex min-h-[120px] w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            className
         )}
         {...props}
      />
   );
});

Textarea.displayName = "Textarea";

export { Textarea };
