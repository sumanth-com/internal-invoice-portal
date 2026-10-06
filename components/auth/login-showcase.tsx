import authArt from "@/assets/auth.jpeg";
import Image from "next/image";

export function LoginShowcase() {
  return (
    <aside className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(165deg,#7C4DFF_0%,#5B2BD6_48%,#3d1a9e_100%)] px-7 py-7 text-left text-white xl:px-8 dark:bg-[linear-gradient(165deg,#6d3ef0_0%,#4c22b8_52%,#31148a_100%)]">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em]">
        <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]" />
        iFRANCHISE
      </div>
      <h2 className="mt-5 max-w-[18rem] text-[1.85rem] font-semibold leading-[1.15] tracking-tight xl:text-[2rem]">
        Invoicing, handled with care.
      </h2>
      <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-white/80">
        Tax invoices, payments, and records in one workspace.
      </p>
      <div className="mt-5 flex flex-1 items-center justify-center">
        <Image
          src={authArt}
          alt="Person reviewing invoices at a desk"
          priority
          className="h-auto max-h-[min(280px,32vh)] w-auto max-w-full rounded-[22px] object-contain"
        />
      </div>
    </aside>
  );
}
