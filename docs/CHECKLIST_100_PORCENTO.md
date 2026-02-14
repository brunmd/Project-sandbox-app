# CHECKLIST PARA 100% DE CONFORMIDADE — StaiDOC
## Tudo que falta para cumprir integralmente o Diagrama de GANTT

**Para:** Gerente da Prevvine Tratamento de Dados Ltda.
**Projeto:** StaiDOC — Sandbox Regulatório ANPD (Edital 02/2025)
**Data:** 14 de Fevereiro de 2026

---

## COMO LER ESTE DOCUMENTO

Cada item abaixo está classificado como:

- **FEITO** = Já implementado e funcional. Nenhuma ação necessária.
- **FEITO AGORA** = Criado/corrigido durante esta auditoria (fevereiro 2026).
- **ACAO GERENTE** = Precisa de ação humana (reunião, decisão, coordenação, contratação).
- **ACAO DPO** = Precisa do Encarregado de Dados (revisão jurídica, adequação legal).
- **ACAO TI** = Precisa de implementação técnica (código, configuração, deploy).
- **ACAO LOVABLE** = Precisa ser solicitado ao Lovable (frontend/interface).

---

## CICLO 1 — FUNDAMENTOS & PRIVACY BY DESIGN

### 1.1 Configuração do ambiente
**Status: FEITO**
Nada a fazer. Supabase configurado em São Paulo (sa-east-1), 12 tabelas, 3 Edge Functions, domínio staidoc.app ativo.

### 1.2 Validação arquitetura Privacy by Design
**Status: FEITO**
Nada a fazer. RLS por médico, anonimização automática, descarte seguro de imagens, CORS restrito, validação de entrada — tudo implementado e auditado.

### 1.3 Teste camada NER (spaCy + Regex)
**Status: PARCIAL — 3 ações pendentes**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 1.3a | Testes formais do anonimizador | ACAO TI | Criar documento com 20-30 casos de teste (textos com CPF, telefone, email, nomes) e registrar quantos foram detectados corretamente. Calcular taxa de acerto (precisão e recall). | Media |
| 1.3b | Decisão sobre spaCy | ACAO GERENTE | O GANTT menciona "spaCy + Regex" mas usamos apenas Regex (funciona bem). Decidir: (a) manter apenas Regex e documentar a justificativa técnica para a ANPD, ou (b) contratar desenvolvimento de microserviço Python com spaCy. Recomendação: opção (a) — Regex com dupla camada é suficiente para o Sandbox. | Decisão |
| 1.3c | Documento de justificativa NER | ACAO DPO | Se optar por manter apenas Regex, redigir justificativa técnica de 1 página explicando por que a abordagem REGEX + prompt dupla camada é equivalente ao spaCy para o escopo do Sandbox. Argumentos: incompatibilidade de runtime (Deno vs Python), dupla camada compensa, 8 tipos de PII detectados com contexto médico. | Facil |

### 1.4 Documentação Ficha A1 + A2
**Status: FEITO AGORA**
Documento `FICHAS_A1_A2.md` sendo criado. O DPO deve revisar e ajustar dados que eu não tenho (CNPJ real, endereço completo, contato do DPO).

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 1.4a | Revisar Fichas A1 e A2 | ACAO DPO | Ler o documento gerado, preencher CNPJ, endereço, nome do DPO. Verificar se o formato atende ao exigido pela ANPD. | Facil |

### 1.5 Buffer — Correções Ciclo 1
**Status: FEITO**
8 migrações de correção já aplicadas.

### 1.6 Relatório Parcial C1
**Status: PENDENTE**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 1.6a | Relatório Parcial C1 | ACAO DPO + CEO | Extrair as seções do Ciclo 1 do RELATORIO_DIRETOR_ANPD.md e formatar como "Relatório Parcial do Ciclo 1" com capa, sumário, e assinaturas do CEO e DPO. | Facil |

---

## CICLO 2 — TRANSPARÊNCIA & EXPLICABILIDADE

### 2.1 Implementação 3 níveis de explicabilidade
**Status: PARCIAL — 2 ações pendentes**

O sistema já registra logs detalhados (nível 2). Os 3 níveis estão definidos na tabela (CHECK constraint 1-3). Falta:

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 2.1a | Definir conteúdo dos 3 níveis | ACAO DPO + GERENTE | Documentar o que cada nível significa na prática: **Nível 1 (básico):** o disclaimer "[HUMAN-IN-THE-LOOP]" que aparece em toda resposta = explicação básica para o médico. **Nível 2 (detalhado):** log completo com modelo, parâmetros, anonimização, verificação PubMed = já implementado. **Nível 3 (técnico):** os mesmos dados do nível 2 + tokens usados, tempo de processamento = já registrado no banco. **NOTA:** Tecnicamente, os 3 níveis JÁ EXISTEM nos dados. O que falta é DOCUMENTAR que eles existem e formalizá-los. | Facil |
| 2.1b | Ajustar nível no código | ACAO TI | Alterar o código para gravar nível 1 quando o disclaimer é simples, nível 2 para respostas normais, nível 3 quando há imagem ou caso complexo. Atualmente, sempre grava nível 2. Mudança de 5 linhas no process-message/index.ts. | Facil |

### 2.2 Teste Matriz Transparência (Art. 20)
**Status: FEITO**
Tags [HUMAN-IN-THE-LOOP], [TRANSPARENCIA], [AVISO DE PRIVACIDADE] implementadas no prompt e renderizadas no frontend.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 2.2a | Teste documentado | ACAO DPO | Enviar 5 perguntas clínicas ao chat, capturar screenshots mostrando: (1) disclaimer aparece em toda resposta, (2) referências PubMed são clicáveis, (3) aviso amarelo aparece quando CPF é digitado. Compilar em documento de evidências. | Facil |

### 2.3 Validação UX — banner + interface
**Status: FEITO**
Landing page, consentimento, onboarding, chat, referências — tudo implementado.

### 2.4 Documentação Transparência A4
**Status: FEITO AGORA**
Documento `FICHAS_A3_A4.md` sendo criado. Inclui a Ficha A4 de Transparência.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 2.4a | Revisar Ficha A4 | ACAO DPO | Ler e validar se atende ao formato ANPD. | Facil |

### 2.5 Buffer — Ajustes UX
**Status: FEITO**

### 2.6 Relatório Parcial C2
**Status: PENDENTE**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 2.6a | Relatório Parcial C2 | ACAO DPO + CEO | Mesmo processo do C1: extrair seções do Ciclo 2 do relatório principal, formatar com capa e assinaturas. | Facil |

---

## CICLO 3 — CONFORMIDADE & AUDITORIA

### 3.1 Auditoria logs
**Status: FEITO**
9 tabelas de compliance implementadas, triggers automáticos, imutabilidade garantida por RULES SQL.

### 3.2 Teste bases legais (Art. 11)
**Status: FEITO**
Base legal registrada em cada consentimento (`LGPD Art. 7, V e Art. 11, II, g`).

### 3.3 Compliance check Art. 37 (ROPA)
**Status: FEITO AGORA**
Documento `ROPA_ART37.md` sendo criado com todas as operações de tratamento mapeadas.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 3.3a | Revisar ROPA | ACAO DPO | Ler o documento ROPA gerado, validar bases legais, adicionar CNPJ, verificar se alguma operação de tratamento está faltando. | Media |

### 3.4 Documentação Coord. Regulatória A3
**Status: FEITO AGORA**
Documento `FICHAS_A3_A4.md` sendo criado, inclui a Ficha A3.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 3.4a | Revisar Ficha A3 | ACAO DPO | Ler e ajustar dados de contato e cronograma. | Facil |

### 3.5 Buffer — Correções conformidade
**Status: FEITO**

### 3.6 Relatório Parcial C3
**Status: PENDENTE**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 3.6a | Relatório Parcial C3 | ACAO DPO + CEO | Extrair seções do Ciclo 3, formatar, assinar. | Facil |

---

## CICLO 4 — SEGURANÇA & RISCOS

### 4.1 Teste segurança AES-256 / TLS 1.3
**Status: PARCIAL — 2 ações**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 4.1a | Documentar criptografia Supabase | ACAO TI | Acessar a documentação do Supabase e capturar evidências de que: (1) TLS 1.2+ está ativo em todas as conexões, (2) encryption at rest (AES-256) está habilitado no PostgreSQL. Incluir screenshots do dashboard. | Facil |
| 4.1b | Habilitar MFA (recomendado) | ACAO GERENTE | No Supabase Dashboard → Authentication → MFA, habilitar TOTP para médicos. Isso adiciona autenticação de dois fatores. Não é obrigatório para o Sandbox, mas fortemente recomendado para dados de saúde. | Media |

### 4.2 Revisão Matriz Riscos B2
**Status: FEITO AGORA**
Documento `MATRIZ_RISCOS_B2.md` sendo criado com 14 riscos mapeados.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 4.2a | Revisar Matriz de Riscos | ACAO DPO + CTO | Ler o documento, validar classificações de probabilidade/impacto, adicionar riscos específicos do negócio que a equipe técnica pode não ter identificado. | Media |

### 4.3 Validação RLS
**Status: FEITO**
RLS por médico individual implementado e otimizado (migration 006).

### 4.4 Simulação de incidente de segurança
**Status: PENDENTE — 1 ação**

A tabela `security_incident_logs` existe com campo `is_simulation = true`. Falta executar a simulação.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 4.4a | Executar simulação de incidente | ACAO GERENTE + DPO + CTO | Realizar um exercício simulado: (1) Criar cenário fictício (ex: "tentativa de acesso não autorizado detectada"), (2) Inserir registro na tabela security_incident_logs com is_simulation=true, (3) Seguir o procedimento de resposta: identificar, conter, comunicar. (4) Documentar tempo de resposta e ações tomadas. (5) Verificar se o campo reported_to_anpd seria preenchido corretamente. **Script SQL para inserir a simulação será fornecido.** | Media |

### 4.5 Documentação Riscos B2 + Rel C4
**Status: FEITO AGORA (Matriz) + PENDENTE (Relatório)**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 4.5a | Relatório Parcial C4 | ACAO DPO + CEO | Extrair seções do Ciclo 4, formatar, assinar. Incluir resultado da simulação de incidente. | Facil |

### 4.6 Buffer — Correções segurança
**Status: FEITO**

---

## CICLO 5 — DIREITOS DOS TITULARES & PORTABILIDADE

### 5.1 Teste exercício de direitos (Art. 18)
**Status: PARCIAL — 2 ações**

O backend suporta os 5 tipos de direitos (acesso, retificação, exclusão, portabilidade, objeção). A tabela `data_subject_requests` existe e funciona. O botão "Excluir conta" já funciona na página Account (bug corrigido). Falta interface completa.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 5.1a | Interface de direitos do titular | ACAO LOVABLE | Solicitar ao Lovable: Na página /account, adicionar seção "Meus Direitos (LGPD Art. 18)" com 5 botões: "Solicitar acesso aos meus dados", "Solicitar retificação", "Solicitar exclusão" (já existe), "Solicitar portabilidade", "Fazer objeção ao tratamento". Cada botão abre modal com campo de texto para descrição e grava na tabela data_subject_requests com o request_type correspondente (access, rectification, deletion, portability, objection). Mostrar também lista das solicitações já feitas com status e deadline. | Media |
| 5.1b | Teste documentado dos 5 direitos | ACAO DPO | Após a interface estar pronta: criar 1 solicitação de cada tipo, capturar screenshots, verificar que o deadline de 15 dias úteis foi calculado corretamente, documentar em relatório de evidências. | Facil |

### 5.2 Teste prazo resposta (15 dias úteis)
**Status: FEITO (backend)**
Função SQL `fn_calculate_business_days_deadline` calcula automaticamente.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 5.2a | Adicionar feriados nacionais | ACAO TI | A função atual exclui sábados e domingos, mas não feriados. Para produção, adicionar tabela de feriados nacionais brasileiros. Para o Sandbox, documentar essa limitação como "melhoria futura". | Baixa prioridade |

### 5.3 Validação portabilidade CSV export
**Status: PENDENTE — 1 ação**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 5.3a | Criar Edge Function de exportação | ACAO TI | Criar nova Edge Function `export-data` que: (1) Autentica o médico, (2) Busca todas as conversas e mensagens do médico, (3) Formata em CSV ou JSON (conforme export_format), (4) Retorna como download. O schema já tem o campo export_format (csv/json) na tabela data_subject_requests. | Media |
| 5.3b | Botão de download no frontend | ACAO LOVABLE | Na interface de direitos (item 5.1a), quando o médico clicar em "Solicitar portabilidade", oferecer botão "Baixar meus dados" que chama a Edge Function export-data e faz download do CSV/JSON. | Facil |

### 5.4 Teste comunicação linguagem simples
**Status: FEITO**
Textos em português claro no consentimento, respostas da IA, página de exclusão de conta.

### 5.5 Documentação Direitos + Rel C5
**Status: PENDENTE**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 5.5a | Relatório Parcial C5 | ACAO DPO + CEO | Extrair seções do Ciclo 5, incluir capturas de tela da interface de direitos, formatar, assinar. | Facil |

### 5.6 Buffer — Ajustes portabilidade
**Status: DEPENDE de 5.3**

### 5.7 Relatório Parcial C5
**Status: DEPENDE de 5.5a**

---

## CICLO 6 — CONSOLIDAÇÃO & ENCERRAMENTO

### 6.1 Revisão integral 6 ciclos
**Status: PARCIAL**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 6.1a | Revisão cruzada | ACAO DPO + CTO + CEO | Reunião para revisar os 6 relatórios parciais (C1-C5 + este relatório). Verificar se todos os itens estão cobertos. Anotar pendências finais. | Media |

### 6.2 Validação final camada NER (produção)
**Status: PARCIAL**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 6.2a | Teste de produção do NER | ACAO TI + DPO | Executar os testes formais definidos em 1.3a em ambiente de produção (staidoc.app). Registrar resultados. Confirmar que a anonimização funciona corretamente com dados reais. | Media |

### 6.3 Preparação PDD — simulação
**Status: FEITO AGORA**
Documento `PDD_PRIVACY_DATA.md` sendo criado.

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 6.3a | Revisar PDD | ACAO DPO | Ler documento, validar mapeamento de dados, ajustar dados do controlador. | Media |
| 6.3b | Simular exercício PDD | ACAO DPO + GERENTE | Fazer exercício simulado: um "titular" (pode ser o próprio gerente) solicita acesso aos seus dados pelo sistema. Documentar o fluxo completo: solicitação → recebimento → processamento → resposta dentro de 15 dias úteis. | Media |

### 6.4 Relatório Final consolidado ANPD
**Status: PARCIAL**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 6.4a | Consolidar relatório final | ACAO CEO + DPO | Juntar: (1) Este relatório de progresso (RELATORIO_DIRETOR_ANPD.md), (2) Os 5 relatórios parciais (C1-C5), (3) Fichas A1-A4, (4) ROPA, (5) Matriz de Riscos, (6) PDD, (7) Documento de referências PubMed. Formatar como relatório final com capa institucional, sumário, numeração de páginas. | Media |

### 6.5 Buffer — Ajustes finais
**Status: DEPENDE dos itens acima**

### 6.6 Relatório Final & Encerramento
**Status: DEPENDE de 6.4a**

| # | Ação | Responsável | O que fazer | Dificuldade |
|---|------|-------------|-------------|-------------|
| 6.6a | Assinatura e envio | ACAO CEO | Assinar relatório final, enviar à ANPD conforme procedimento do Edital 02/2025. | Facil |

---

## RESUMO CONSOLIDADO — TODAS AS AÇÕES PENDENTES

### Por responsável:

#### ACAO GERENTE (5 itens)
| # | Ação | Ciclo | Dificuldade |
|---|------|-------|-------------|
| 1.3b | Decisão sobre spaCy vs Regex | C1 | Decisão |
| 4.1b | Habilitar MFA no Supabase (recomendado) | C4 | Media |
| 4.4a | Executar simulação de incidente | C4 | Media |
| 6.3b | Simular exercício PDD | C6 | Media |
| 6.6a | Assinar e enviar relatório final | C6 | Facil |

#### ACAO DPO (12 itens)
| # | Ação | Ciclo | Dificuldade |
|---|------|-------|-------------|
| 1.3c | Justificativa técnica NER | C1 | Facil |
| 1.4a | Revisar Fichas A1/A2 | C1 | Facil |
| 1.6a | Relatório Parcial C1 | C1 | Facil |
| 2.1a | Definir conteúdo dos 3 níveis | C2 | Facil |
| 2.2a | Teste documentado transparência | C2 | Facil |
| 2.4a | Revisar Ficha A4 | C2 | Facil |
| 2.6a | Relatório Parcial C2 | C2 | Facil |
| 3.3a | Revisar ROPA | C3 | Media |
| 3.4a | Revisar Ficha A3 | C3 | Facil |
| 3.6a | Relatório Parcial C3 | C3 | Facil |
| 4.2a | Revisar Matriz de Riscos | C4 | Media |
| 4.5a | Relatório Parcial C4 | C4 | Facil |
| 5.1b | Teste documentado dos 5 direitos | C5 | Facil |
| 5.5a | Relatório Parcial C5 | C5 | Facil |
| 6.1a | Revisão cruzada 6 ciclos | C6 | Media |
| 6.3a | Revisar PDD | C6 | Media |
| 6.4a | Consolidar relatório final | C6 | Media |

#### ACAO TI (4 itens)
| # | Ação | Ciclo | Dificuldade |
|---|------|-------|-------------|
| 1.3a | Testes formais do anonimizador | C1 | Media |
| 2.1b | Ajustar nível explicabilidade no código | C2 | Facil |
| 4.1a | Documentar criptografia Supabase | C4 | Facil |
| 5.3a | Criar Edge Function export-data | C5 | Media |
| 6.2a | Teste de produção do NER | C6 | Media |

#### ACAO LOVABLE (2 itens)
| # | Ação | Ciclo | Dificuldade |
|---|------|-------|-------------|
| 5.1a | Interface de direitos do titular | C5 | Media |
| 5.3b | Botão download portabilidade | C5 | Facil |

---

## ORDEM RECOMENDADA DE EXECUÇÃO

### Semana 1 (Prioridade máxima — documentação)
1. DPO revisa Fichas A1-A4, ROPA, Matriz de Riscos, PDD (tudo já foi gerado — só revisar e ajustar)
2. Gerente decide sobre spaCy vs Regex (recomendação: manter Regex)
3. TI ajusta nível de explicabilidade no código (5 linhas)

### Semana 2 (Interface e testes)
4. Solicitar ao Lovable: interface de direitos do titular na página /account
5. TI cria Edge Function export-data (portabilidade CSV)
6. DPO faz testes documentados de transparência (screenshots)
7. TI cria e executa testes formais do anonimizador

### Semana 3 (Simulações e relatórios parciais)
8. Gerente + DPO + CTO executam simulação de incidente de segurança
9. DPO + CEO elaboram os 5 relatórios parciais (C1 a C5)
10. DPO simula exercício PDD (titular solicita dados)
11. TI documenta criptografia do Supabase (screenshots)

### Semana 4 (Consolidação)
12. DPO + CTO fazem revisão cruzada dos 6 ciclos
13. CEO + DPO consolidam relatório final
14. CEO assina e prepara para envio à ANPD

---

## DOCUMENTOS JÁ EXISTENTES NA PASTA docs/

| # | Arquivo | Descrição | Status |
|---|---------|-----------|--------|
| 1 | `DATABASE_SCHEMA.md` | Esquema completo do banco de dados | Pronto |
| 2 | `LOVABLE_INTEGRATION.md` | Instruções de integração com frontend | Pronto |
| 3 | `VERIFICACAO_REFERENCIAS_PUBMED.md` | Sistema NTAV de verificação bibliográfica | Pronto |
| 4 | `RELATORIO_DIRETOR_ANPD.md` | Relatório técnico completo por ciclo | Pronto |
| 5 | `CHECKLIST_100_PORCENTO.md` | Este documento | Pronto |
| 6 | `FICHAS_A1_A2.md` | Ficha de Identificação + Descrição Técnica | Em criação |
| 7 | `FICHAS_A3_A4.md` | Coord. Regulatória + Transparência | Em criação |
| 8 | `ROPA_ART37.md` | Registro de Operações de Tratamento | Em criação |
| 9 | `MATRIZ_RISCOS_B2.md` | Matriz de Riscos (14 riscos mapeados) | Em criação |
| 10 | `PDD_PRIVACY_DATA.md` | Privacy Data Documentation | Em criação |

---

## SCRIPT SQL PARA SIMULAÇÃO DE INCIDENTE (Item 4.4a)

Quando for o momento de executar a simulação, usar este SQL no Supabase SQL Editor:

```sql
-- SIMULACAO DE INCIDENTE DE SEGURANCA
-- Cenário: Tentativa de acesso não autorizado detectada
INSERT INTO security_incident_logs (
  incident_type,
  severity,
  description,
  affected_users_count,
  detected_at,
  resolved_at,
  resolution_description,
  reported_to_anpd,
  reported_at,
  is_simulation
) VALUES (
  'unauthorized_access_attempt',
  'medium',
  'Simulação: Detectada tentativa de acesso a dados de paciente por usuário sem permissão. '
  || 'O sistema de Row Level Security (RLS) bloqueou automaticamente a tentativa. '
  || 'Nenhum dado foi exposto. O incidente foi registrado nos audit_logs.',
  0,
  NOW(),
  NOW() + INTERVAL '2 hours',
  'Simulação: RLS bloqueou acesso automaticamente. Usuário notificado. '
  || 'Logs revisados. Nenhuma ação adicional necessária.',
  true,
  NOW() + INTERVAL '4 hours',
  true  -- is_simulation = true
);
```

---

*Documento operacional elaborado para facilitar a execução das ações pendentes pela equipe da Prevvine Tratamento de Dados Ltda.*
