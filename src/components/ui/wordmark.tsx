export interface WordmarkProps {
  big?: boolean;
}

export function Wordmark({ big }: WordmarkProps) {
  return (
    <div className="flex flex-col leading-none">
      <div
        className={`font-extrabold tracking-tight ${big ? "text-xl" : "text-[17px]"}`}
      >
        Deal<span className="text-violet">Craft</span>
      </div>
      <div className="text-[10.5px] tracking-wide text-cold">by Humand</div>
    </div>
  );
}
