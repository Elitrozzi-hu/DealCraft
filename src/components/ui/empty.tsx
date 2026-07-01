export interface EmptyProps {
  text: string;
}

export function Empty({ text }: EmptyProps) {
  return <div className="py-2 text-[12.5px] italic text-cold">{text}</div>;
}
