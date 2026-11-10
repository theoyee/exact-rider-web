'use client';
import { Button } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main-content" className="grid min-h-svh place-items-center p-6"><div className="max-w-sm text-center"><h1 className="text-3xl font-medium">Let’s try that again.</h1><p className="my-4 text-zinc-500">Something interrupted this page. Your active ride is saved in this tab.</p><Button onClick={reset}>Reload this page</Button></div></main>; }
