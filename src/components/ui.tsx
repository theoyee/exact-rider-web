import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="Exact home" className={`inline-flex items-center gap-2.5 ${light ? 'text-white' : 'text-zinc-950'}`}><Image src="/brand/logo.svg" width={32} height={32} alt="" /><span className="text-[29px] leading-none font-bold tracking-[-1.7px]">exact</span><span className={`ml-2 hidden rounded-full border sm:inline px-2.5 py-1 text-[10px] font-medium tracking-[.12em] uppercase ${light ? 'border-white/25 text-white/70' : 'border-zinc-200 text-zinc-500'}`}>Rider</span></Link>;
}
export function Button({ children, busy = false, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button {...props} disabled={props.disabled || busy} className={`button ${variant === 'primary' ? 'bg-zinc-950 text-white hover:bg-zinc-800' : variant === 'secondary' ? 'border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50' : 'bg-transparent text-zinc-600 hover:bg-zinc-100'} ${className}`}>
    {busy && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}{children}
  </button>;
}
export function PageHeading({ title, eyebrow, back = '/ride', description }: { title: string; eyebrow?: string; back?: string; description?: string }) {
  return <div className="mb-7"><div className="mb-6 flex items-center justify-between"><Link href={back} className="icon-button" aria-label="Go back"><ArrowLeft size={20} /></Link><span className="text-xs text-zinc-400">{eyebrow ?? 'YOUR RIDE, YOUR WAY'}</span></div><h1 className="text-[29px] font-medium leading-tight tracking-[-1.1px]">{title}</h1>{description && <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>}</div>;
}
export function ErrorNotice({ message, onRetry }: { message: string | null | undefined; onRetry?: () => void }) {
  if (!message) return null;
  return <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{message}{onRetry && <button onClick={onRetry} className="mt-2 block font-medium underline underline-offset-4">Try again</button>}</div>;
}
export function TrustNote() { return <div className="flex items-center justify-center gap-2 text-xs text-zinc-400"><ShieldCheck size={15} /><span>Your journey. A little more peace of mind.</span></div>; }
export function EmptyState({ title, text, href = '/ride', action = 'Plan a trip' }: { title: string; text: string; href?: string; action?: string }) {
  return <div className="py-12 text-center"><div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-blue-600"><ArrowRight /></div><h1 className="text-2xl font-medium tracking-tight">{title}</h1><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-500">{text}</p><Link href={href} className="button mt-6 bg-zinc-950 text-white">{action}<ArrowRight size={18} /></Link></div>;
}
