import InputForm from "@/components/InputForm";
export const metadata = { title: "Hedge your GPU rental bill — gIA" };
export default function StartPage() {
  return <div className="mx-auto grid max-w-7xl gap-14 px-5 py-14 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:py-24">
    <section className="rise">
      <p className="eyebrow">GPU Insurance Agent · on Injective</p>
      <h1 className="display mt-6 text-[clamp(3rem,7vw,6.5rem)]">Turn a floating GPU bill into a budget you can <em className="text-mauve">plan around.</em></h1>
      <p className="mt-8 max-w-xl text-lg text-muted-foreground">Tell us your monthly spend, GPU mix and coverage horizon. gIA sizes a monthly ladder of capped calls using the project&apos;s indicative pricing model.</p>
      <ol className="mt-10 divide-y divide-border border-y border-border text-sm">
        <li className="py-5">01 · Choose your mix or use the SICI basket weights.</li>
        <li className="py-5">02 · Compare premiums, payouts and basis risk.</li>
        <li className="py-5">03 · Simulate your hedge. Nothing is signed, sent or paid.</li>
      </ol>
    </section>
    <section className="panel rise h-fit p-6 md:p-8"><InputForm /></section>
  </div>;
}
