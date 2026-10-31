# RegulaSUS — Central de Regulação do SUS com IA

Agiliza a regulação da fila do SUS: analisa o paciente, mede a gravidade/complexidade (Protocolo de
Manchester) e o encaminha para a unidade mais capacitada **com vaga**. A IA sugere; o médico regulador decide.

> Os pacientes e unidades do seed são **fictícios**. Este projeto é acadêmico e não substitui um sistema
> oficial de regulação nem o julgamento clínico.

## Entregas da atividade

| # | Atividade | Onde |
|---|---|---|
| 1 | App com IA na Vercel, com prompt (contexto, objetivo, funcionalidades) | [docs/PROMPT.md](docs/PROMPT.md) |
| 2 | Repositório GitHub ligado à Vercel | [docs/DEPLOY.md](docs/DEPLOY.md) |
| 3 | Agente de IA / app de regulação da fila do SUS | este projeto (`lib/triage.ts`, `lib/agent.ts`) |

## Funcionalidades

- Login **gov.br** (OIDC + PKCE) e **acesso provisório**, com perfis `regulador`, `unidade` e `gestor`
- Cadastro com sinais vitais e triagem por IA (cor, risco 0–100, complexidade, especialidade, sinais de alarme)
- **Protocolo de reserva por regras** quando a IA está indisponível (conservador: na dúvida, mais grave)
- Fila priorizada com alerta de **prazo de Manchester excedido**
- Recomendação de unidade capacitada com vaga e **reserva atômica** da vaga
- **Rede de segurança clínica**: as regras rodam sempre e a IA nunca classifica abaixo delas
- **Agente de IA** (chat com ferramentas: resumo, fila, paciente, unidades) — só sugere
- **Auditoria** (quem/o quê/quando) e minimização de dados (o agente não vê nome nem CNS)

## Rodar localmente

```bash
pnpm install
cp .env.example .env.local      # preencha DATABASE_URL e AUTH_SECRET
pnpm db:setup                   # cria tabelas + dados fictícios
pnpm dev                        # http://localhost:3000
pnpm test                       # 44 testes (casos clínicos, fila, unidades)
```

`pnpm db:reset` apaga e recria o banco (recusa bancos remotos). Veja o [CHANGELOG](CHANGELOG.md) e o
[relatório de debug](docs/RELATORIO-DEBUG.md).

A IA usa o AI Gateway da Vercel (`AI_GATEWAY_API_KEY`). Sem ela, a triagem cai no protocolo por regras e o
agente avisa que está indisponível; o resto do app funciona.

## Perfis

| Perfil | Pode |
|---|---|
| Médico regulador | cadastrar, analisar, encaminhar, usar o agente, atualizar vagas |
| Unidade de saúde | atualizar **só as vagas da própria unidade** (não vê pacientes) |
| Gestor | tudo do regulador + trilha de auditoria |

## Limitações conhecidas

- Login gov.br implementado conforme a documentação do Login Único, mas **não testado contra o gov.br real**
  (depende de credenciais de adesão). O acesso provisório não verifica identidade: em produção ele exige
  `PROVISIONAL_ACCESS_CODE` (e `PROVISIONAL_GESTOR_CODE` para gestor) ou deve ser desligado com `PROVISIONAL_ACCESS=off`.
- O protocolo de regras é um apoio e **não foi validado clinicamente**; não substitui o médico regulador.
- Dados reais de pacientes exigem adequação à LGPD, ao CFM e à integração com CNES/SISREG, fora do escopo.
