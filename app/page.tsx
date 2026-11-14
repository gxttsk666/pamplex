"use client";

import React, { useState } from "react";
import {
  Bell,
  Hash,
  Mic,
  MicOff,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [serverName, setServerName] = useState("");
  const [radarSpeaking, setRadarSpeaking] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-pamplex-bg text-pamplex-text-primary px-6 py-10">
      <div className="mx-auto max-w-5xl flex flex-col gap-8">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-pamplex-border pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-pamplex-turquesa text-pamplex-dark font-bold text-lg shadow-md shadow-pamplex-turquesa/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-pamplex-text-primary">
                  Pamplex
                </h1>
                <Badge variant="turquesa" dot>
                  Design System v1.0
                </Badge>
              </div>
              <p className="text-sm text-pamplex-text-secondary">
                Fundação visual, superfícies, componentes reutilizáveis e Radar Vivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Menu
              align="right"
              trigger={
                <Button variant="secondary" size="md">
                  <Settings className="h-4 w-4 text-pamplex-text-secondary" />
                  Opções
                </Button>
              }
              items={[
                {
                  id: "invite",
                  label: "Convidar pessoas",
                  icon: <Users className="h-4 w-4 text-pamplex-turquesa" />,
                  onSelect: () => setLastAction("Menu: Convidar pessoas"),
                },
                {
                  id: "notifications",
                  label: "Silenciar alertas",
                  icon: <Bell className="h-4 w-4" />,
                  onSelect: () => setLastAction("Menu: Silenciar alertas"),
                },
                {
                  id: "delete",
                  label: "Sair da comunidade",
                  icon: <Trash2 className="h-4 w-4" />,
                  danger: true,
                  onSelect: () => setLastAction("Menu: Sair da comunidade"),
                },
              ]}
            />

            <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Servidor
            </Button>
          </div>
        </header>

        {lastAction && (
          <div className="flex items-center justify-between rounded-[8px] border border-pamplex-turquesa/30 bg-pamplex-floresta-bg px-4 py-2.5 text-sm text-pamplex-menta">
            <span>Ação testada: {lastAction}</span>
            <button
              type="button"
              onClick={() => setLastAction(null)}
              className="text-xs text-pamplex-text-secondary hover:text-pamplex-text-primary cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Grade Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cartão 1: Botões e Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Botões & Etiquetas</CardTitle>
              <CardDescription>
                Contraste alto em turquesa, verde positivo, superfícies e estados.
              </CardDescription>
            </CardHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary">Primário</Button>
                <Button variant="positive">Entrar na Call</Button>
                <Button variant="secondary">Secundário</Button>
                <Button variant="ghost">Discreto</Button>
                <Button variant="danger">Excluir</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-pamplex-border">
                <Badge variant="esmeralda" dot>
                  Online agora
                </Badge>
                <Badge variant="turquesa">Fundador</Badge>
                <Badge variant="floresta">
                  <ShieldCheck className="h-3 w-3" />
                  Pamplex Shield
                </Badge>
                <Badge variant="warning">Ausente</Badge>
                <Badge variant="danger">Silenciado</Badge>
              </div>
            </div>
          </Card>

          {/* Cartão 2: Campos de Entrada */}
          <Card>
            <CardHeader>
              <CardTitle>Campos de Entrada</CardTitle>
              <CardDescription>
                Fundo grafite extremo (#0E0F11) com foco acessível em turquesa.
              </CardDescription>
            </CardHeader>

            <div className="flex flex-col gap-3.5">
              <Input
                label="Buscar canais ou mensagens"
                placeholder="Ex: #geral ou @gustavo..."
                leftIcon={<Search className="h-4 w-4" />}
              />
              <Input
                label="Exemplo de validação"
                defaultValue="nome-inválido!"
                error="Use apenas letras minúsculas, números e hífens."
              />
            </div>
          </Card>

          {/* Cartão 3: Radar Vivo */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Radar Vivo (Presença em Voz)</CardTitle>
                <Badge variant={radarSpeaking ? "esmeralda" : "neutral"} dot>
                  {radarSpeaking ? "Fala ativa" : "Em silêncio"}
                </Badge>
              </div>
              <CardDescription>
                Pulsa suavemente (2,4s) apenas quando alguém está a falar e respeita prefers-reduced-motion.
              </CardDescription>
            </CardHeader>

            <div className="flex items-center justify-between rounded-[12px] bg-pamplex-sidebar border border-pamplex-border p-3.5">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-[14px] bg-pamplex-elevated font-semibold text-pamplex-text-primary transition-all",
                      radarSpeaking
                        ? "ring-2 ring-pamplex-esmeralda animate-radar-vivo"
                        : "border border-pamplex-border",
                    ].join(" ")}
                  >
                    <Radio className="h-5 w-5 text-pamplex-esmeralda" />
                  </div>

                  <div className="absolute -bottom-1 -right-1 flex -space-x-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pamplex-turquesa text-[9px] font-bold text-pamplex-dark ring-2 ring-pamplex-sidebar">
                      G
                    </span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pamplex-esmeralda text-[9px] font-bold text-pamplex-dark ring-2 ring-pamplex-sidebar">
                      A
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-pamplex-text-primary flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-pamplex-esmeralda" />
                    Sala de Voz • Geral
                  </p>
                  <p className="text-xs text-pamplex-text-secondary">
                    2 membros conectados agora
                  </p>
                </div>
              </div>

              <Button
                variant={radarSpeaking ? "secondary" : "positive"}
                size="sm"
                onClick={() => setRadarSpeaking((prev) => !prev)}
              >
                {radarSpeaking ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    Simular Silêncio
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Simular Fala
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Cartão 4: Hierarquia de Superfícies e Arredondamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Superfícies & Escala de Bordas</CardTitle>
              <CardDescription>
                Tokens registrados no Tailwind v4 (@theme inline).
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-[6px] bg-pamplex-dark border border-pamplex-border p-3">
                <p className="font-semibold text-pamplex-text-primary">#0E0F11</p>
                <p className="text-pamplex-text-muted">Extremo • 6px</p>
              </div>
              <div className="rounded-[8px] bg-pamplex-sidebar border border-pamplex-border p-3">
                <p className="font-semibold text-pamplex-text-primary">#181A1F</p>
                <p className="text-pamplex-text-muted">Sidebar • 8px</p>
              </div>
              <div className="rounded-[12px] bg-pamplex-surface border border-pamplex-border p-3">
                <p className="font-semibold text-pamplex-text-primary">#20232A</p>
                <p className="text-pamplex-text-muted">Superfície • 12px</p>
              </div>
              <div className="rounded-[14px] bg-pamplex-elevated border border-pamplex-border p-3">
                <p className="font-semibold text-pamplex-text-primary">#282C34</p>
                <p className="text-pamplex-text-muted">Elevada • 14px</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Modal de Teste */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Criar novo servidor"
          description="Dê um nome para a sua comunidade no Pamplex."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setLastAction(
                    `Servidor "${serverName.trim() || "Comunidade Pamplex"}" simulado`
                  );
                  setServerName("");
                  setModalOpen(false);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Criar Servidor
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Input
              label="Nome do servidor"
              placeholder="Ex: Oficina 3D & Projetos"
              leftIcon={<Hash className="h-4 w-4" />}
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </main>
  );
}