# PDD — PRIVACY DATA DOCUMENTATION

## Documentacao de Privacidade de Dados Pessoais

**Projeto:** StaiDOC — Assistente de Suporte ao Diagnostico Medico
**Versao:** 1.0
**Data de Elaboracao:** 14 de fevereiro de 2026
**Classificacao:** Documento Confidencial — Uso Interno e ANPD
**Referencia:** Sandbox Regulatorio ANPD — Edital 02/2025

---

## 1. Identificacao do Controlador

| Campo | Informacao |
|-------|-----------|
| **Razao Social** | Prevvine Tratamento de Dados Ltda. |
| **CNPJ** | [A ser preenchido] |
| **Endereco** | [A ser preenchido] |
| **Telefone** | [A ser preenchido] |
| **E-mail institucional** | [A ser preenchido] |
| **Representante legal** | [A ser preenchido] |
| **Atividade principal** | Desenvolvimento de solucoes de inteligencia artificial aplicadas a saude, com foco em suporte ao diagnostico medico |

---

## 2. Encarregado de Dados (DPO)

| Campo | Informacao |
|-------|-----------|
| **Nome** | A designar |
| **E-mail de contato** | dpo@prevvine.com.br (a ser ativado) |
| **Telefone** | [A ser preenchido] |
| **Canal de atendimento ao titular** | [A ser implementado — formulario web dedicado] |

**Nota:** A designacao formal do Encarregado de Dados sera realizada em ate 30 (trinta) dias apos o inicio do periodo de Sandbox Regulatorio, conforme exigencia do Art. 41 da LGPD. O nome e dados de contato do DPO serao publicados no site institucional da Prevvine e comunicados a ANPD.

---

## 3. Mapeamento de Dados Pessoais Tratados

### 3.1 Dados dos Medicos (Usuarios do Sistema)

| Dado Pessoal | Categoria | Origem | Obrigatoriedade |
|--------------|-----------|--------|-----------------|
| Nome completo | Identificacao | Cadastro pelo medico | Obrigatorio |
| E-mail profissional | Contato | Cadastro pelo medico | Obrigatorio |
| CRM (numero e estado) | Identificacao profissional | Cadastro pelo medico | Obrigatorio |
| Especialidade medica | Profissional | Cadastro pelo medico | Obrigatorio |
| Senha (hash bcrypt) | Autenticacao | Cadastro pelo medico | Obrigatorio |
| Token JWT | Autenticacao | Gerado pelo sistema | Automatico |
| IP de acesso | Log de seguranca | Capturado automaticamente | Automatico |
| Data/hora de acesso | Log de seguranca | Capturado automaticamente | Automatico |

### 3.2 Dados de Pacientes (Dados Sensiveis — Art. 11, LGPD)

| Dado Pessoal | Categoria LGPD | Tratamento | Armazenamento |
|--------------|----------------|------------|---------------|
| Nome do paciente | Dado pessoal | Anonimizado antes de processamento | Nunca armazenado em texto claro |
| CPF | Dado pessoal | Removido por REGEX no `anonymizer.ts` | Nunca armazenado |
| Telefone | Dado pessoal | Removido por REGEX no `anonymizer.ts` | Nunca armazenado |
| Endereco | Dado pessoal | Removido por REGEX no `anonymizer.ts` | Nunca armazenado |
| Data de nascimento | Dado pessoal | Removida por REGEX no `anonymizer.ts` | Nunca armazenado |
| Historico clinico (anamnese) | Dado sensivel (saude) | Anonimizado, processado pela IA | Armazenado anonimizado |
| Sintomas e queixas | Dado sensivel (saude) | Anonimizado, processado pela IA | Armazenado anonimizado |
| Hipoteses diagnosticas | Dado sensivel (saude) | Gerado pela IA como suporte | Armazenado vinculado ao medico |
| Imagens medicas | Dado sensivel (saude) | Processado somente em memoria | Nunca armazenado (secure wipe) |
| Resultados de exames | Dado sensivel (saude) | Anonimizado, processado pela IA | Armazenado anonimizado |

### 3.3 Dados de Auditoria e Logs

| Dado | Categoria | Finalidade | Retencao |
|------|-----------|------------|----------|
| Logs de acesso | Operacional | Seguranca e compliance | 6 meses (Marco Civil da Internet) |
| Logs de auditoria (`audit_logs`) | Operacional | ROPA — Art. 37, LGPD | 5 anos |
| Logs de explicabilidade (`explainability_logs`) | Operacional | Art. 20, LGPD — decisoes automatizadas | Duracao do Sandbox + 1 ano |
| Logs de incidentes (`security_incident_logs`) | Seguranca | Art. 48, LGPD — comunicacao de incidentes | 5 anos |
| Solicitacoes de titulares (`data_subject_requests`) | Compliance | Art. 18, LGPD — direitos dos titulares | Duracao da relacao + 5 anos |
| Registros de consentimento | Compliance | Art. 8, LGPD — comprovacao de consentimento | Duracao da relacao + 5 anos |

---

## 4. Finalidade e Base Legal de Cada Tratamento

### 4.1 Quadro de Tratamentos

| N. | Operacao de Tratamento | Finalidade | Base Legal (LGPD) | Dados Envolvidos |
|----|----------------------|------------|-------------------|------------------|
| 1 | Cadastro e autenticacao de medicos | Controle de acesso ao sistema e identificacao do profissional responsavel | Art. 7, II — Cumprimento de obrigacao legal (registro profissional) e Art. 7, V — Execucao de contrato | Nome, e-mail, CRM, senha (hash) |
| 2 | Processamento de texto clinico pela IA | Suporte ao diagnostico medico — auxiliar o profissional na analise clinica | Art. 11, II, "a" — Tutela da saude, em procedimento realizado por profissional de saude | Texto clinico anonimizado |
| 3 | Processamento de imagens medicas | Analise visual de exames para suporte diagnostico | Art. 11, II, "a" — Tutela da saude | Imagem processada em memoria (nao armazenada) |
| 4 | Verificacao de referencias bibliograficas | Validacao cientifica das sugestoes da IA via PubMed | Art. 7, IX — Interesse legitimo do controlador | Termos de busca (sem dados pessoais) |
| 5 | Registro de logs de auditoria | Cumprimento de obrigacoes legais de rastreabilidade e prestacao de contas | Art. 7, II — Cumprimento de obrigacao legal e Art. 6, X — Responsabilizacao e prestacao de contas | Acoes do usuario, timestamps, metadados |
| 6 | Registro de explicabilidade da IA | Garantir direito a explicacao sobre decisoes automatizadas | Art. 20 — Direito a revisao de decisoes automatizadas | Prompts anonimizados, respostas, modelo utilizado |
| 7 | Atendimento a solicitacoes de titulares | Cumprimento dos direitos previstos no Art. 18 | Art. 18 — Direitos do titular | Dados do solicitante, tipo de pedido, resposta |
| 8 | Gerenciamento de consentimentos | Registro e comprovacao de consentimentos obtidos | Art. 8 — Consentimento | Identificacao do titular, tipo de consentimento, data, revogacao |
| 9 | Armazenamento de historico de conversas | Continuidade do atendimento e consulta a analises anteriores pelo medico | Art. 7, V — Execucao de contrato | Conversas anonimizadas, respostas da IA |

### 4.2 Observacao sobre Dados Sensiveis

Conforme o Art. 11 da LGPD, o tratamento de dados pessoais sensiveis relativos a saude e realizado exclusivamente para fins de tutela da saude, em procedimento conduzido por profissional de saude habilitado (medico com CRM ativo). O StaiDOC atua como ferramenta de **suporte**, sendo o medico o unico responsavel pela decisao diagnostica final, conforme principio **Human-in-the-Loop**.

---

## 5. Medidas Tecnicas e Organizacionais de Seguranca

### 5.1 Criptografia

| Camada | Tecnologia | Detalhamento |
|--------|------------|-------------|
| **Em transito** | TLS 1.2+ (HTTPS) | Todas as comunicacoes entre cliente (navegador) e servidor (Supabase) sao criptografadas via TLS 1.2 ou superior. Certificados gerenciados automaticamente pelo Supabase. |
| **Em repouso** | AES-256 | Banco de dados PostgreSQL gerenciado pelo Supabase com criptografia AES-256 em repouso. Discos criptografados na infraestrutura AWS (sa-east-1). |
| **Senhas** | bcrypt | Senhas de usuarios armazenadas com hash bcrypt (salt automatico) via Supabase Auth. Texto claro nunca e armazenado ou logado. |
| **Hashes de verificacao** | SHA-256 | Utilizado para gerar hashes unidirecionais de identificadores de pacientes. Permite auditoria sem expor dados originais. |

### 5.2 Controle de Acesso

| Mecanismo | Implementacao | Escopo |
|-----------|---------------|--------|
| **Row Level Security (RLS)** | Politicas RLS ativadas em todas as 12 tabelas do banco de dados | Cada medico acessa somente seus proprios dados. Consultas SQL sao filtradas automaticamente por `auth.uid()`. |
| **Chave `service_role`** | Utilizada exclusivamente no backend para operacoes de auditoria | Acesso administrativo restrito a gravacao de logs. Nao exposta ao frontend. |
| **JWT (JSON Web Token)** | Tokens de sessao com tempo de vida limitado | Refresh automatico via `refreshSession()`. Interceptor de HTTP 401 com retry. |
| **Autenticacao multifator (MFA)** | Planejada para implementacao | A ser habilitada via Supabase Auth durante o Sandbox. |

### 5.3 Anonimizacao

| Camada | Tecnologia | Descricao |
|--------|------------|-----------|
| **1a Camada — REGEX** | `anonymizer.ts` | Modulo TypeScript com expressoes regulares para deteccao e remocao de: CPF (XXX.XXX.XXX-XX), RG, telefones (fixo e celular), e-mails, nomes proprios (heuristica por capitalizacao e dicionario), enderecos, datas de nascimento. |
| **2a Camada — Prompt** | Instrucao no system prompt do Claude | O prompt do modelo de IA contem instrucao explicita para nao reproduzir, citar ou inferir dados pessoais identificaveis que eventualmente escapem da primeira camada. |
| **3a Camada — NER (planejada)** | spaCy pt-br (a implementar) | Reconhecimento de entidades nomeadas (Named Entity Recognition) com modelo treinado em portugues brasileiro, como camada adicional de protecao contra falsos negativos do REGEX. |

### 5.4 Integridade

| Mecanismo | Implementacao |
|-----------|---------------|
| **Logs imutaveis** | Tabela `audit_logs` configurada com politica somente INSERT (sem UPDATE ou DELETE). Integridade garantida por restricao de politica RLS e ausencia de funcoes de modificacao. |
| **Hash de verificacao** | SHA-256 aplicado a conteudo enviado a API externa para verificacao posterior de integridade. |
| **Backups** | Backups automaticos diarios pelo Supabase com retencao de 7 dias. Possibilidade de point-in-time recovery. |

### 5.5 Disponibilidade

| Aspecto | Detalhamento |
|---------|-------------|
| **Infraestrutura** | Supabase managed, hospedado na regiao sa-east-1 (Sao Paulo, Brasil) na infraestrutura AWS. |
| **SLA** | 99.9% de disponibilidade garantida pelo Supabase (plano Pro). |
| **Redundancia** | Replicacao automatica gerenciada pela AWS. Failover automatico em caso de falha de instancia. |
| **Monitoramento** | Health checks periodicos. Alertas configurados para indisponibilidade. |

---

## 6. Politica de Retencao de Dados

### 6.1 Quadro de Retencao

| Categoria de Dado | Periodo de Retencao | Fundamentacao Legal | Procedimento de Descarte |
|-------------------|---------------------|---------------------|--------------------------|
| **Logs de acesso (conexao)** | 6 (seis) meses | Art. 15, Marco Civil da Internet (Lei n. 12.965/2014) | Exclusao automatica por rotina agendada (cron job) apos o periodo. |
| **Logs de auditoria** (`audit_logs`) | 5 (cinco) anos | Art. 37, LGPD — Registro de operacoes de tratamento; boas praticas de governanca | Exclusao segura com sobrescrita apos o periodo, mediante autorizacao do DPO. |
| **Dados clinicos anonimizados** | Duracao do Sandbox + 1 (um) ano | Finalidade de pesquisa e desenvolvimento no ambito do Sandbox Regulatorio | Exclusao completa de todos os registros clinicos apos o periodo. Relatorio de descarte emitido. |
| **Registros de consentimento** | Duracao da relacao contratual + 5 (cinco) anos | Art. 8, par. 2, LGPD — Onus da prova do consentimento e do controlador | Exclusao segura apos o periodo prescricional. |
| **Solicitacoes de titulares** (`data_subject_requests`) | Duracao da relacao contratual + 5 (cinco) anos | Art. 18, LGPD — comprovacao de atendimento aos direitos | Exclusao segura apos o periodo prescricional. |
| **Logs de explicabilidade** (`explainability_logs`) | Duracao do Sandbox + 1 (um) ano | Art. 20, LGPD — Garantia de revisao de decisoes automatizadas | Exclusao segura apos o periodo, mediante relatorio final. |
| **Logs de incidentes de seguranca** (`security_incident_logs`) | 5 (cinco) anos | Art. 48, LGPD; boas praticas de seguranca da informacao | Exclusao segura apos o periodo, mediante autorizacao do DPO. |
| **Imagens medicas** | Zero (nao armazenado) | Principio da necessidade (Art. 6, III, LGPD) | Secure wipe imediato apos processamento em memoria. |

### 6.2 Procedimento de Descarte

O descarte de dados seguira o seguinte procedimento:

1. **Identificacao:** rotina automatizada identifica registros que atingiram o prazo de retencao;
2. **Autorizacao:** DPO autoriza formalmente o descarte (exceto para exclusoes automaticas de logs de acesso);
3. **Execucao:** exclusao logica seguida de exclusao fisica com sobrescrita;
4. **Registro:** emissao de relatorio de descarte com data, volume de registros, responsavel e metodo utilizado;
5. **Arquivo:** relatorio de descarte arquivado por 5 (cinco) anos.

---

## 7. Transferencia Internacional de Dados

### 7.1 Identificacao da Transferencia

| Aspecto | Detalhamento |
|---------|-------------|
| **Destinatario** | Anthropic, PBC |
| **Pais de destino** | Estados Unidos da America (EUA) |
| **Dados transferidos** | Textos clinicos **exclusivamente anonimizados** |
| **Finalidade** | Processamento por modelo de linguagem (Claude) para geracao de suporte diagnostico |
| **Frequencia** | A cada consulta realizada pelo medico no sistema |

### 7.2 Medidas de Protecao

| Medida | Descricao |
|--------|-----------|
| **Anonimizacao previa** | Todo texto clinico e anonimizado ANTES do envio a API da Anthropic. Dados pessoais identificaveis (nomes, CPF, telefone, endereco, data de nascimento) sao removidos pelas duas camadas de anonimizacao. |
| **Natureza dos dados transferidos** | Os dados transferidos sao considerados **dados anonimizados** conforme Art. 12 da LGPD, pois nao permitem a identificacao do titular por meios razoavelmente disponiveis. Portanto, formalmente, nao constituem dados pessoais para efeito da transferencia. |
| **Criptografia em transito** | Comunicacao via HTTPS (TLS 1.2+) entre o servidor Supabase e a API da Anthropic. |
| **Politica de dados da Anthropic** | A Anthropic declara nao utilizar dados enviados via API comercial para treinamento de modelos, conforme seus termos de servico. |
| **Auditoria** | Hash SHA-256 do conteudo enviado e registrado em `audit_logs` para rastreabilidade. |

### 7.3 Base Legal para Transferencia

Conforme Art. 33 da LGPD, a transferencia internacional e fundamentada em:

- **Art. 12:** Os dados transferidos sao anonimizados e, portanto, nao se enquadram como dados pessoais para fins da LGPD, dispensando autorizacao especifica para transferencia internacional;
- **Subsidiariamente, Art. 33, IX:** Autorizacao da ANPD no ambito do Sandbox Regulatorio, caso se entenda que dados anonimizados com risco residual de reidentificacao ainda se enquadram no escopo da Lei.

---

## 8. Mecanismos de Exercicio de Direitos dos Titulares (Art. 18, LGPD)

### 8.1 Direitos Garantidos

| Direito (Art. 18) | Implementacao | Canal | Prazo |
|-------------------|---------------|-------|-------|
| **I — Confirmacao de tratamento** | Consulta a tabela de dados do titular | Canal do DPO | 15 dias uteis |
| **II — Acesso aos dados** | Exportacao dos dados pessoais armazenados | Canal do DPO | 15 dias uteis |
| **III — Correcao de dados** | Atualizacao no cadastro do medico | Canal do DPO ou autoservico | 15 dias uteis |
| **IV — Anonimizacao, bloqueio ou eliminacao** | Execucao de procedimento de anonimizacao ou exclusao | Canal do DPO | 15 dias uteis |
| **V — Portabilidade** | Exportacao em formato estruturado (JSON/CSV) | Canal do DPO | 15 dias uteis |
| **VI — Eliminacao de dados com consentimento** | Exclusao de dados tratados com base no consentimento | Canal do DPO | 15 dias uteis |
| **VII — Informacao sobre compartilhamento** | Relatorio de entidades com as quais dados foram compartilhados | Canal do DPO | 15 dias uteis |
| **VIII — Informacao sobre negar consentimento** | Informativo sobre consequencias da nao concessao de consentimento | Canal do DPO | 15 dias uteis |
| **IX — Revogacao do consentimento** | Registro de revogacao e cessacao do tratamento | Canal do DPO ou autoservico | 15 dias uteis |

### 8.2 Infraestrutura Tecnica

| Componente | Descricao |
|------------|-----------|
| **Tabela `data_subject_requests`** | Armazena todas as solicitacoes de titulares com campos: `id`, `request_type`, `requester_id`, `status`, `created_at`, `deadline`, `completed_at`, `response`, `handled_by` |
| **Calculo de deadline** | 15 dias uteis a partir de `created_at`, descontando fins de semana e feriados nacionais |
| **Status possiveis** | `received`, `in_analysis`, `completed`, `denied_with_justification` |
| **Notificacoes** | Alertas automaticos ao DPO quando solicitacao se aproxima do prazo (a implementar) |

### 8.3 Pendencias

- Interface frontend para o proprio titular realizar solicitacoes (formulario web);
- Sistema automatico de notificacao de prazos ao DPO;
- Pagina publica de politica de privacidade com instrucoes de exercicio de direitos.

---

## 9. Contato do Encarregado de Dados (DPO)

| Canal | Informacao |
|-------|-----------|
| **E-mail** | dpo@prevvine.com.br (a ser ativado) |
| **Formulario web** | [A ser implementado] |
| **Endereco fisico** | [A ser preenchido — endereco da sede da Prevvine] |
| **Horario de atendimento** | Segunda a sexta-feira, das 9h as 18h (horario de Brasilia) |
| **Prazo de resposta** | Ate 15 (quinze) dias uteis, conforme Art. 18, LGPD |

---

## 10. Glossario

| Termo | Definicao |
|-------|-----------|
| **LGPD** | Lei Geral de Protecao de Dados Pessoais (Lei n. 13.709/2018) |
| **ANPD** | Autoridade Nacional de Protecao de Dados |
| **DPO** | Data Protection Officer — Encarregado de Dados Pessoais |
| **PDD** | Privacy Data Documentation — Documentacao de Privacidade de Dados |
| **ROPA** | Record of Processing Activities — Registro de Operacoes de Tratamento |
| **RLS** | Row Level Security — Seguranca em Nivel de Linha |
| **NTAV** | Never Trust, Always Verify — principio de verificacao de referencias |
| **NER** | Named Entity Recognition — Reconhecimento de Entidades Nomeadas |
| **Human-in-the-Loop** | Principio que garante a decisao final por um humano (medico) |

---

## 11. Historico de Revisoes

| Versao | Data | Descricao | Autor |
|--------|------|-----------|-------|
| 1.0 | 14/02/2026 | Elaboracao inicial do PDD | Equipe Tecnica Prevvine |
| | | | |

---

## 12. Aprovacao

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Diretor Tecnico | _________________ | ___/___/2026 | _________________ |
| Encarregado de Dados (DPO) | _________________ | ___/___/2026 | _________________ |
| Consultor Juridico | _________________ | ___/___/2026 | _________________ |

---

*Documento elaborado em conformidade com a Lei Geral de Protecao de Dados Pessoais (Lei n. 13.709/2018), o Marco Civil da Internet (Lei n. 12.965/2014) e as diretrizes do Sandbox Regulatorio da ANPD (Edital 02/2025).*
