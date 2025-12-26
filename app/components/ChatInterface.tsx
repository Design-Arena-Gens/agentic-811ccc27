"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import {
  listStyleProfiles,
  pickStyleProfile,
  renderGeminiCanvas,
  type StyleProfile
} from "../lib/visualEngine";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  image?: string;
  createdAt: number;
  meta?: {
    styleId: string;
    iteration: number;
    baseImageUsed?: boolean;
  };
};

const profileOptions = listStyleProfiles();

function resolveProfile(id: string): StyleProfile {
  return profileOptions.find((profile) => profile.id === id) ?? profileOptions[0];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-assistant",
      role: "assistant",
      text: "Oi! Sou o seu atelier visual estilo Gemini. Envie uma ideia e eu transformo em uma arte consistente. Você também pode carregar uma imagem para transformá-la.",
      createdAt: Date.now(),
      meta: {
        styleId: profileOptions[0].id,
        iteration: 0
      }
    }
  ]);
  const [input, setInput] = useState("Quero um pôster futurista de uma cidade submersa iluminada por neon.");
  const [isBusy, setIsBusy] = useState(false);
  const [styleId, setStyleId] = useState<string>(profileOptions[0].id);
  const [iteration, setIteration] = useState(0);
  const [baseImageData, setBaseImageData] = useState<string | undefined>(undefined);
  const [previewBaseName, setPreviewBaseName] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeStyle = useMemo(() => resolveProfile(styleId), [styleId]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isBusy]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setBaseImageData(result);
        setPreviewBaseName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const pushMessage = useCallback((message: Omit<ChatMessage, "createdAt">) => {
    setMessages((prev) => [...prev, { ...message, createdAt: Date.now() }]);
  }, []);

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isBusy) return;
    setIsBusy(true);
    setInput("");

    const firstProfile = pickStyleProfile(prompt + styleId);
    if (!styleId) {
      setStyleId(firstProfile.id);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);

    const styleProfile = resolveProfile(styleId || firstProfile.id);
    const nextIteration = iteration + 1;
    setIteration(nextIteration);

    try {
      const image = await renderGeminiCanvas(prompt, styleProfile, nextIteration, baseImageData);
      const assistantText = buildAssistantCaption(prompt, styleProfile, Boolean(baseImageData));
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: assistantText,
        image,
        createdAt: Date.now(),
        meta: {
          styleId: styleProfile.id,
          iteration: nextIteration,
          baseImageUsed: Boolean(baseImageData)
        }
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallbackMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        text: "Não consegui gerar a composição agora. Tente novamente com outro pedido ou recarregue a página.",
        createdAt: Date.now(),
        meta: {
          styleId: styleProfile.id,
          iteration: nextIteration
        }
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsBusy(false);
    }
  }, [input, isBusy, iteration, styleId, baseImageData]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAdoptBase = useCallback((image?: string) => {
    if (!image) return;
    setBaseImageData(image);
    setPreviewBaseName("Canvas anterior");
  }, []);

  const handleClearBase = useCallback(() => {
    setBaseImageData(undefined);
    setPreviewBaseName(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-80 border-r border-white/10 bg-chat-panel/40 backdrop-blur p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Ateliê Visual</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Interface conversacional inspirada no Gemini para criar e transformar imagens de forma consistente.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest text-white/50">Perfil estético</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent"
            value={styleId}
            onChange={(event) => setStyleId(event.target.value)}
          >
            {profileOptions.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/50">
            Mantemos um estilo coerente ao longo da conversa. Escolha um perfil para controlar a identidade visual.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest text-white/50">Imagem base (opcional)</label>
          <div className="flex gap-2">
            <button
              onClick={handleUploadClick}
              className="flex-1 rounded-lg bg-white/5 border border-dashed border-white/20 py-2 text-sm hover:border-chat-accent transition"
              type="button"
            >
              Carregar imagem
            </button>
            {baseImageData && (
              <button
                onClick={handleClearBase}
                className="px-3 py-2 text-xs bg-white/10 rounded-lg hover:bg-white/20 transition"
                type="button"
              >
                Limpar
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-white/50">
            Use uma imagem existente para aplicar o estilo escolhido. Adotamos tonalidades e texturas consistentes.
          </p>
          {baseImageData && (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img src={baseImageData} alt="Pré-visualização base" className="w-full" />
              <div className="px-3 py-2 text-xs bg-white/5 border-t border-white/10">
                Base ativa: {previewBaseName ?? "Imagem carregada"}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -12 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={clsx("flex gap-4", {
                    "flex-row-reverse text-right": message.role === "user"
                  })}
                >
                  <div
                    className={clsx(
                      "size-10 rounded-full flex items-center justify-center text-sm font-semibold border",
                      message.role === "user"
                        ? "bg-chat-accent border-chat-accent text-white"
                        : "bg-white/5 border-white/10 text-white/80"
                    )}
                  >
                    {message.role === "user" ? "Você" : "AVA"}
                  </div>
                  <div
                    className={clsx(
                      "max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-lg",
                      message.role === "user"
                        ? "bg-chat-accent/20 border border-chat-accent/40"
                        : "bg-white/5 border border-white/10"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.image && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        <img src={message.image} alt={message.text} className="w-full" />
                        <div className="flex items-center justify-between px-4 py-3 text-xs text-white/60 bg-black/30 border-t border-white/10">
                          <span>
                            {message.meta?.baseImageUsed
                              ? "Transformação estilizada"
                              : "Composição original"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdoptBase(message.image)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition"
                          >
                            Usar como base
                          </button>
                        </div>
                      </div>
                    )}
                    {message.meta && message.role === "assistant" && (
                      <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {resolveProfile(message.meta.styleId).label} · Iteração {message.meta.iteration}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isBusy && (
              <div className="flex gap-3 text-white/60 text-sm">
                <div className="size-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                  AVA
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="size-2 bg-white/40 rounded-full animate-bounce" />
                  <div className="size-2 bg-white/40 rounded-full animate-bounce delay-150" />
                  <div className="size-2 bg-white/40 rounded-full animate-bounce delay-300" />
                  <span className="pl-3">Gerando composição...</span>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-white/10 bg-chat-panel/60 backdrop-blur px-4 sm:px-8 py-5">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <textarea
                className="w-full bg-transparent px-5 pt-5 pb-3 text-sm focus:outline-none resize-none min-h-[120px] placeholder:text-white/40"
                placeholder="Descreva a imagem que deseja criar..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-5 py-3">
                <div className="text-xs text-white/50">
                  Pressione Enter para enviar · Shift + Enter para quebrar linha
                </div>
                <div className="flex gap-2">
                  {baseImageData && (
                    <span className="text-xs text-chat-accent bg-chat-accent/10 border border-chat-accent/30 px-3 py-1 rounded-full">
                      Base aplicada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isBusy || !input.trim()}
                    className="px-4 py-2 rounded-xl bg-chat-accent hover:bg-chat-accent-soft disabled:opacity-40 text-sm font-semibold transition"
                  >
                    {isBusy ? "Gerando..." : "Criar imagem"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function buildAssistantCaption(prompt: string, profile: StyleProfile, usedBase: boolean): string {
  const summary = summarizePrompt(prompt);
  const profileTone = profile.label;
  if (usedBase) {
    return `Transformei a base fornecida seguindo o estilo ${profileTone}. Destaquei ${summary} e preservei a identidade estabelecida.`;
  }
  return `Modelei uma composição original em ${profileTone}, enfatizando ${summary}. Podemos iterar com novos ajustes.`;
}

function summarizePrompt(prompt: string): string {
  const keywords = prompt
    .split(/[,.;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (keywords.length === 0) {
    return "os conceitos principais do pedido";
  }
  if (keywords.length === 1) {
    return keywords[0].toLowerCase();
  }
  return `${keywords[0].toLowerCase()} e ${keywords[1].toLowerCase()}`;
}
