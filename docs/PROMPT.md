# Atividade 1 — Prompt do app com IA (Vercel)

Prompt usado para gerar o app (contexto + objetivo + funcionalidades), pronto para colar no v0 / Vercel.

---

## Contexto

O SUS tem filas de espera de regulação (consultas, exames, leitos e urgências) que atrasam o atendimento.
Pacientes graves esperam na mesma fila que casos leves, a decisão de para onde enviar cada paciente depende
de ligações e planilhas, e muita gente piora ou morre antes de ser regulada. Os médicos reguladores precisam
decidir rápido, com informação confiável sobre a gravidade do caso e sobre quais unidades têm vaga.

## Objetivo

Criar o **RegulaSUS**, uma central de regulação com IA que **acelera o atendimento e a regulação**:
analisa cada paciente, mede a gravidade e a complexidade do caso e o **encaminha para a unidade de saúde
mais capacitada que tenha vaga**. A IA apoia a decisão; o médico regulador sempre confirma.

## Funcionalidades

1. **Login** com gov.br (Login Único) e acesso provisório; perfis: médico regulador, unidade de saúde, gestor.
2. **Cadastro do paciente**: idade, sexo, município, queixa, comorbidades e sinais vitais (PA, FC, FR, SpO2, temperatura, Glasgow).
3. **Triagem com IA** (Protocolo de Manchester): cor de prioridade, escore de risco (0–100), complexidade
   (básica, UPA, média, alta), especialidade necessária, sinais de alarme e justificativa. Se a IA falhar,
   um protocolo automático por regras assume.
4. **Fila priorizada**: vermelho → azul, desempate por risco e tempo de espera; alerta de **prazo de Manchester excedido**.
5. **Recomendação de unidade**: só unidades com nível e especialidade adequados **e vaga**, priorizando o mesmo
   município e evitando sobrecarregar hospitais de referência.
6. **Encaminhamento** com reserva atômica da vaga (sem vender a mesma vaga duas vezes).
7. **Painel de unidades**: vagas e ocupação em tempo real, atualizadas pelas próprias unidades.
8. **Agente de IA regulador**: chat que consulta fila e vagas por ferramentas e sugere encaminhamentos.
9. **Auditoria e LGPD**: toda ação registrada (quem, o quê, quando); o agente não recebe nome nem CNS.

## Regras de segurança clínica

- Na dúvida, classificar com **maior** gravidade.
- A IA nunca encaminha sozinha: sugere, o humano confirma.
- Mostrar sempre a justificativa e os sinais de alarme.

## Stack

Next.js (App Router) + React + Tailwind + shadcn/ui, PostgreSQL (Drizzle), Vercel AI SDK com AI Gateway
(modelo `openai/gpt-5.4-mini`), implantado na Vercel.

## Prompt único (para colar)

> Crie um app web em português chamado RegulaSUS, uma central de regulação da fila do SUS com IA. Contexto:
> pessoas morrem esperando atendimento porque a regulação é lenta e pacientes graves ficam misturados a casos
> leves. Objetivo: agilizar o atendimento e a regulação. Funcionalidades: login (gov.br e acesso provisório,
> com perfis regulador/unidade/gestor); cadastro do paciente com queixa e sinais vitais; triagem por IA pelo
> Protocolo de Manchester retornando cor, escore de risco, complexidade, especialidade, sinais de alarme e
> justificativa (com protocolo de regras como reserva); fila priorizada com alerta de prazo excedido;
> recomendação da unidade mais capacitada COM VAGA; encaminhamento que reserva a vaga atomicamente; painel de
> unidades com vagas em tempo real; agente de IA que consulta fila e vagas por ferramentas e apenas sugere;
> trilha de auditoria e conformidade com a LGPD. Use Next.js, Tailwind, PostgreSQL e AI SDK.
