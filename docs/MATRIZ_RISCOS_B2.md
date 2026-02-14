# MATRIZ DE RISCOS B2 — Sandbox Regulatorio ANPD (Edital 02/2025)

**Empresa:** Prevvine Tratamento de Dados Ltda.
**Projeto:** StaiDOC — Assistente de Suporte ao Diagnostico Medico
**Versao:** 1.0
**Data de Elaboracao:** 14 de fevereiro de 2026
**Responsavel:** Equipe Tecnica Prevvine
**Classificacao:** Documento Confidencial — Uso Interno e ANPD

---

## 1. Objetivo

Este documento apresenta a Matriz de Riscos exigida no formulario B2 do Sandbox Regulatorio da ANPD (Edital 02/2025), identificando, classificando e detalhando as medidas de mitigacao para cada risco associado ao tratamento de dados pessoais no projeto StaiDOC.

A avaliacao segue metodologia quantitativa com escala de Probabilidade (1-5) e Impacto (1-5), gerando um Score de Risco (P x I) que determina a classificacao final.

---

## 2. Escala de Classificacao

### 2.1 Probabilidade

| Nivel | Valor | Descricao |
|-------|-------|-----------|
| Muito Baixa | 1 | Evento improvavel, controles robustos implementados |
| Baixa | 2 | Evento raro, controles adequados |
| Media | 3 | Evento possivel, controles parciais |
| Alta | 4 | Evento provavel, controles insuficientes |
| Muito Alta | 5 | Evento quase certo, sem controles |

### 2.2 Impacto

| Nivel | Valor | Descricao |
|-------|-------|-----------|
| Insignificante | 1 | Sem impacto real aos titulares |
| Menor | 2 | Desconforto minimo, sem dano material |
| Moderado | 3 | Dano potencial reversivel aos titulares |
| Maior | 4 | Dano significativo, potencial violacao de direitos |
| Critico | 5 | Dano grave e irreversivel, dados sensiveis expostos |

### 2.3 Classificacao do Risco Residual

| Score (P x I) | Classificacao | Acao Requerida |
|---------------|---------------|----------------|
| 1-4 | MUITO BAIXO | Monitoramento periodico |
| 5-8 | BAIXO | Controles existentes adequados |
| 9-12 | MEDIO | Plano de acao corretivo recomendado |
| 13-19 | ALTO | Acao corretiva imediata necessaria |
| 20-25 | CRITICO | Suspensao do tratamento ate mitigacao |

---

## 3. Matriz de Riscos

### 3.1 Riscos de Privacidade

| ID | Risco | Prob. (1-5) | Impacto (1-5) | Score (PxI) | Mitigacao Implementada | Risco Residual | Status |
|----|-------|-------------|---------------|-------------|------------------------|----------------|--------|
| PR-01 | Vazamento de dados pessoais em texto clinico (nomes, CPF, enderecos presentes em anamneses e relatorios) | 2 | 5 | 10 | Anonimizacao REGEX dupla camada: (1) `anonymizer.ts` com patterns para CPF, telefone, nomes proprios, enderecos; (2) instrucao explicita no prompt do Claude para ignorar e nao reproduzir dados pessoais residuais. Validacao por testes automatizados. | BAIXO | Implementado |
| PR-02 | Armazenamento indevido de imagens medicas (radiografias, exames laboratoriais, laudos escaneados) | 1 | 5 | 5 | Processamento exclusivamente em memoria (RAM). Implementacao de `secure wipe` com sobrescrita de buffer apos processamento. Log de descarte registrado em `audit_logs` com timestamp e hash de verificacao. Nenhuma imagem e persistida em disco ou banco. | MUITO BAIXO | Implementado |
| PR-03 | Reidentificacao de dados anonimizados por correlacao ou engenharia reversa | 2 | 4 | 8 | Hash SHA-256 unidirecional aplicado a identificadores. Texto original do paciente nunca e armazenado — apenas o texto ja anonimizado e persistido. Sem tabela de correspondencia (lookup table) entre hash e dados originais. K-anonimidade natural pela ausencia de quasi-identificadores. | BAIXO | Implementado |
| PR-04 | Acesso nao autorizado a dados clinicos de outro medico (violacao de segregacao) | 1 | 5 | 5 | Row Level Security (RLS) ativada em TODAS as 12 tabelas do banco de dados. Politicas vinculadas ao `auth.uid()` do Supabase. Chave `service_role` utilizada exclusivamente para operacoes de auditoria (logs). Testes de penetracao horizontal planejados para fase de sandbox. | MUITO BAIXO | Implementado |
| PR-05 | Dados pessoais de pacientes enviados inadvertidamente a API da Anthropic (Claude) | 2 | 5 | 10 | Pipeline de anonimizacao executado ANTES de qualquer chamada a API externa. Fluxo: texto clinico -> `anonymizer.ts` (REGEX) -> texto anonimizado -> API Anthropic. Logs de auditoria registram hash do texto enviado para verificacao posterior. Nenhum dado pessoal identificavel transita para servidores da Anthropic. | BAIXO | Implementado |

### 3.2 Riscos Tecnico-Operacionais

| ID | Risco | Prob. (1-5) | Impacto (1-5) | Score (PxI) | Mitigacao Implementada | Risco Residual | Status |
|----|-------|-------------|---------------|-------------|------------------------|----------------|--------|
| TO-06 | Indisponibilidade do sistema (downtime do backend ou banco de dados) | 2 | 3 | 6 | Infraestrutura gerenciada pelo Supabase com SLA de 99.9%. Regiao sa-east-1 (Sao Paulo) para menor latencia. Backups automaticos diarios com retencao de 7 dias. Monitoramento de health check configurado. | BAIXO | Implementado |
| TO-07 | Falha na anonimizacao — falso negativo do NER/REGEX (dado pessoal nao detectado) | 3 | 5 | 15 | Dupla camada de protecao: (1) REGEX patterns abrangentes em `anonymizer.ts` cobrindo CPF, RG, telefone, email, nomes proprios, enderecos, datas de nascimento; (2) Instrucao no system prompt do Claude para nao reproduzir dados pessoais. Plano de melhoria: implementar NER com modelo de linguagem dedicado (spaCy pt-br) como terceira camada. | MEDIO | Implementado (parcial) |
| TO-08 | Alucinacao de referencias bibliograficas pela IA (citacoes inexistentes ou incorretas) | 1 | 4 | 4 | Sistema NTAV (Never Trust, Always Verify) implementado: toda referencia gerada pelo Claude e verificada automaticamente via PubMed E-utilities (API do NCBI). Referencias nao encontradas sao sinalizadas com tag `[NAO VERIFICADA]`. Log de verificacao armazenado em `explainability_logs`. | MUITO BAIXO | Implementado |
| TO-09 | Perda de resposta durante streaming por troca de aba ou minimizacao do navegador (tab-switch) | 2 | 2 | 4 | Handler de `visibilitychange` implementado no frontend. Quando a aba perde foco durante streaming, o sistema aciona fallback para leitura da resposta completa do banco de dados (DB fallback). Resposta parcial e reconciliada automaticamente ao retornar a aba. | BAIXO | Implementado |
| TO-10 | Expiracao de token JWT durante uso prolongado (sessao invalida sem aviso) | 2 | 3 | 6 | Chamada automatica de `refreshSession()` antes da expiracao. Interceptor de respostas HTTP 401 com retry automatico apos refresh. Fallback para tela de login em caso de falha no refresh. Sessoes configuradas com tempo de vida adequado ao uso clinico. | BAIXO | Implementado |

### 3.3 Riscos Regulatorios

| ID | Risco | Prob. (1-5) | Impacto (1-5) | Score (PxI) | Mitigacao Implementada | Risco Residual | Status |
|----|-------|-------------|---------------|-------------|------------------------|----------------|--------|
| RG-11 | Nao-conformidade com Art. 18 da LGPD (direitos dos titulares — acesso, correcao, exclusao, portabilidade) | 3 | 4 | 12 | Tabela `data_subject_requests` implementada no banco de dados com campos: tipo de solicitacao, status, deadline de 15 dias uteis, responsavel, resposta. Registro automatico de timestamp de recebimento e conclusao. **Pendencia:** interface frontend para o titular exercer seus direitos ainda nao implementada. | MEDIO | Parcialmente implementado |
| RG-12 | Nao-conformidade com Art. 37 da LGPD (Registro de Operacoes de Tratamento — ROPA) | 2 | 4 | 8 | Tabela `audit_logs` imutavel (somente INSERT, sem UPDATE ou DELETE) registrando todas as operacoes de tratamento. ROPA formal documentado neste PDD. Campos: acao, tabela afetada, usuario, timestamp, dados antes/depois (quando aplicavel). | BAIXO | Implementado |
| RG-13 | Falta de explicabilidade das decisoes da IA (Art. 20 — decisoes automatizadas) | 2 | 4 | 8 | Tabela `explainability_logs` armazena: prompt enviado (anonimizado), resposta recebida, modelo utilizado, tokens consumidos, fontes consultadas. Tags `[HUMAN-IN-THE-LOOP]` aplicadas a todas as respostas, evidenciando que o medico e o decisor final. Disclaimer permanente na interface do usuario. | BAIXO | Implementado |
| RG-14 | Incidente de seguranca nao comunicado a ANPD (Art. 48 — comunicacao de incidentes) | 3 | 5 | 15 | Tabela `security_incident_logs` implementada com campos: tipo de incidente, severidade, dados afetados, timestamp de deteccao, acoes tomadas, campo `reported_to_anpd` (booleano). **Pendencia:** processo formal de comunicacao a ANPD em ate 2 dias uteis ainda nao formalizado em procedimento operacional. | MEDIO | Parcialmente implementado |

---

## 4. Mapa de Calor (Heat Map)

```
IMPACTO
  5 |  [PR-02,PR-04]   [PR-01,PR-05]   [TO-07,RG-14]
  4 |  [TO-08]          [PR-03,RG-12,RG-13] [RG-11]
  3 |                   [TO-06,TO-10]
  2 |                   [TO-09]
  1 |
    +----------------------------------------------------
       1               2               3               4               5
                              PROBABILIDADE
```

**Legenda:** Riscos posicionados conforme sua Probabilidade (eixo X) e Impacto (eixo Y).

---

## 5. Plano de Acao para Riscos Residuais MEDIO

| ID | Risco | Score | Acao Corretiva | Prazo | Responsavel |
|----|-------|-------|----------------|-------|-------------|
| TO-07 | Falha na anonimizacao (falso negativo) | 15 | Implementar terceira camada de NER com spaCy pt-br. Criar suite de testes com corpus de textos clinicos reais anonimizados. | 90 dias apos inicio do Sandbox | Equipe Tecnica |
| RG-11 | Nao-conformidade Art. 18 (direitos titulares) | 12 | Desenvolver interface frontend para solicitacoes de titulares. Integrar com tabela `data_subject_requests`. Implementar notificacoes automaticas de prazo. | 60 dias apos inicio do Sandbox | Equipe Tecnica + DPO |
| RG-14 | Incidente de seguranca nao comunicado | 15 | Formalizar Procedimento Operacional Padrao (POP) de comunicacao de incidentes. Definir cadeia de comunicacao. Realizar simulacao de incidente. | 30 dias apos inicio do Sandbox | DPO + Diretoria |

---

## 6. Revisao e Atualizacao

Esta Matriz de Riscos sera revisada:
- **Trimestralmente** durante o periodo do Sandbox Regulatorio;
- **Imediatamente** apos qualquer incidente de seguranca ou alteracao significativa no sistema;
- **Antes do encerramento** do periodo de Sandbox, com relatorio final para a ANPD.

---

## 7. Aprovacao

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Diretor Tecnico | _________________ | ___/___/2026 | _________________ |
| Encarregado de Dados (DPO) | _________________ | ___/___/2026 | _________________ |
| Responsavel pelo Projeto | _________________ | ___/___/2026 | _________________ |

---

*Documento elaborado em conformidade com o Edital 02/2025 do Sandbox Regulatorio da ANPD e com a Lei Geral de Protecao de Dados Pessoais (Lei n. 13.709/2018).*
