import { WHATSAPP, WHATSAPP_URL } from "@/lib/site-config"

/** Botão flutuante do WhatsApp (canto inferior direito), com mensagem inicial já escrita. O clique é medido pelo data-track. */
export function WhatsAppButton() {
  return (
    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-track="whatsapp_flutuante"
      aria-label={`Falar com o Partigol no WhatsApp: ${WHATSAPP.display}`} title="Fale conosco no WhatsApp"
      className="group fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition hover:bg-[#1ebe5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:bottom-6">
      <svg aria-hidden viewBox="0 0 32 32" className="size-7 fill-current"><path d="M16.04 3C8.86 3 3.02 8.83 3.02 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A13 13 0 0 0 16.04 29C23.2 29 29 23.17 29 16S23.2 3 16.04 3Zm0 23.78c-1.95 0-3.86-.52-5.53-1.51l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.74 10.74 0 0 1 5.3 16c0-5.92 4.82-10.74 10.75-10.74 5.92 0 10.73 4.82 10.73 10.74 0 5.93-4.81 10.78-10.74 10.78Zm5.89-8.05c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.5.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.32.16.22 2.26 3.45 5.47 4.84.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" /></svg>
      <span className="hidden pr-1 text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  )
}
