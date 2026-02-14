# ROPA - Registro de Operacoes de Tratamento de Dados Pessoais

## Conforme Art. 37 da Lei Geral de Protecao de Dados Pessoais (Lei n. 13.709/2018)

---

## 1. Identificacao do Controlador

| Campo | Informacao |
|---|---|
| **Razao Social** | Prevvine Tratamento de Dados Ltda. |
| **Projeto** | StaiDOC -- Assistente Inteligente de Suporte ao Diagnostico Medico |
| **Contexto Regulatorio** | Sandbox Regulatorio da ANPD -- Edital 02/2025 |
| **Encarregado (DPO)** | A designar conforme Art. 41 da LGPD |
| **Data de Elaboracao** | 14 de fevereiro de 2026 |
| **Periodo de Vigencia** | Vigente a partir da data de elaboracao, com revisoes semestrais obrigatorias |
| **Versao do Documento** | 1.0 |
| **Responsavel pela Elaboracao** | Equipe de Compliance e Protecao de Dados -- Prevvine |

---

## 2. Descricao Geral do Tratamento

O StaiDOC e um assistente inteligente de suporte ao diagnostico medico que utiliza inteligencia artificial (modelo Claude Opus 4.6, Anthropic) para auxiliar profissionais de saude na analise de dados clinicos e imagens medicas. O sistema opera sob o principio de **privacy by design**, implementando anonimizacao previa ao processamento por IA, armazenamento minimo de dados sensiveis e rastreabilidade completa de todas as operacoes de tratamento.

O presente registro documenta cada operacao de tratamento realizada pelo sistema, em conformidade com o Art. 37 da LGPD, que determina que o controlador e o operador devem manter registro das operacoes de tratamento de dados pessoais que realizarem.

---

## 3. Operacoes de Tratamento

### 3.1. Cadastro do Medico (Signup)

| Campo | Descricao |
|---|---|
| **Operacao** | Cadastro e autenticacao do profissional de saude |
| **Dados Tratados** | E-mail, senha (armazenada em hash), nome completo, CRM, estado (UF), especialidade medica |
| **Categoria dos Dados** | Dados cadastrais e profissionais |
| **Categoria dos Titulares** | Profissionais de saude (medicos) |
| **Finalidade** | Identificacao e autenticacao do profissional de saude para acesso ao sistema |
| **Base Legal** | Art. 7, inciso V -- Execucao de contrato ou de procedimentos preliminares relacionados a contrato do qual seja parte o titular |
| **Destinatarios/Compartilhamento** | Supabase Auth (servico de autenticacao); tabela `profiles` no banco de dados |
| **Transferencia Internacional** | Supabase (infraestrutura AWS) -- clausulas contratuais padrao aplicaveis |
| **Prazo de Retencao** | Enquanto houver relacao contratual vigente, acrescido de 5 (cinco) anos apos o termino |
| **Medidas de Seguranca** | Hash bcrypt da senha; Row Level Security (RLS) por medico; criptografia em transito (TLS 1.2+); validacao de CRM |

---

### 3.2. Consentimento Informado

| Campo | Descricao |
|---|---|
| **Operacao** | Registro e gerenciamento de consentimento do titular |
| **Dados Tratados** | Tipo de consentimento, versao do termo, data e hora do registro, endereco IP, user agent do navegador, base legal aplicavel |
| **Categoria dos Dados** | Dados de consentimento e metadados de sessao |
| **Categoria dos Titulares** | Profissionais de saude (medicos) |
| **Finalidade** | Registro formal de consentimento conforme Arts. 7 e 11 da LGPD, garantindo rastreabilidade e comprovacao da manifestacao de vontade do titular |
| **Base Legal** | Art. 7, inciso I -- Consentimento do titular; Art. 11, inciso I -- Consentimento especifico e destacado para dados sensiveis |
| **Destinatarios/Compartilhamento** | Tabela `consent_records` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | Durante a relacao contratual, acrescido de 5 (cinco) anos apos eventual revogacao do consentimento |
| **Medidas de Seguranca** | Row Level Security (RLS); registros imutaveis implementados via triggers de banco de dados (vedada alteracao ou exclusao); auditoria automatica |

---

### 3.3. Envio de Mensagem Clinica

| Campo | Descricao |
|---|---|
| **Operacao** | Recepcao, anonimizacao e processamento de texto clinico para suporte diagnostico |
| **Dados Tratados** | Texto clinico (ANONIMIZADO previamente a qualquer processamento ou transmissao); hash SHA-256 do texto original |
| **Categoria dos Dados** | Dados de saude (sensiveis, Art. 5, inciso II), porem submetidos a anonimizacao antes do processamento pela IA |
| **Categoria dos Titulares** | Pacientes (dados anonimizados); profissionais de saude (dados da sessao) |
| **Finalidade** | Suporte ao diagnostico medico por meio de analise de texto clinico anonimizado |
| **Base Legal** | Art. 11, inciso II, alinea "g" -- Tutela da saude, exclusivamente, em procedimento realizado por profissionais de saude, servicos de saude ou autoridade sanitaria |
| **Destinatarios/Compartilhamento** | API Anthropic (modelo Claude Opus 4.6) -- recebe EXCLUSIVAMENTE o texto anonimizado; nenhum dado pessoal identificavel e transmitido ao operador de IA |
| **Transferencia Internacional** | Anthropic (EUA) -- recebe apenas dados anonimizados; clausulas contratuais padrao aplicaveis ao servico |
| **Prazo de Retencao** | Duracao do programa Sandbox Regulatorio, acrescido de 1 (um) ano |
| **Medidas de Seguranca** | Anonimizacao por NER (Named Entity Recognition) combinada com REGEX; hash SHA-256 do texto original para rastreabilidade sem reversibilidade; Row Level Security (RLS); log completo da operacao de anonimizacao; criptografia em transito (TLS 1.2+) |

---

### 3.4. Processamento de Imagem Medica

| Campo | Descricao |
|---|---|
| **Operacao** | Recepcao, processamento em memoria e descarte seguro de imagem medica |
| **Dados Tratados** | Imagem medica (processada exclusivamente em memoria volatil, NUNCA armazenada em disco ou banco de dados); hash SHA-256 da imagem |
| **Categoria dos Dados** | Dados de saude (sensiveis, Art. 5, inciso II) |
| **Categoria dos Titulares** | Pacientes (dados da imagem); profissionais de saude (dados da sessao) |
| **Finalidade** | Analise de exames de imagem para suporte ao diagnostico medico |
| **Base Legal** | Art. 11, inciso II, alinea "g" -- Tutela da saude, exclusivamente, em procedimento realizado por profissionais de saude |
| **Destinatarios/Compartilhamento** | API Anthropic (memoria volatil) -- imagem descartada imediatamente apos processamento; nenhuma copia e retida pelo operador de IA |
| **Transferencia Internacional** | Anthropic (EUA) -- processamento volatil sem retencao; clausulas contratuais padrao aplicaveis |
| **Prazo de Retencao** | ZERO -- a imagem e processada e descartada em memoria; apenas o hash SHA-256 e retido para fins de auditoria |
| **Medidas de Seguranca** | Validacao de integridade por magic bytes; secure wipe (preenchimento com zeros -- `fill(0)`) apos processamento; log de descarte com timestamps precisos; nao persistencia em disco ou banco de dados; criptografia em transito (TLS 1.2+) |

---

### 3.5. Geracao de Resposta da IA

| Campo | Descricao |
|---|---|
| **Operacao** | Geracao, verificacao e armazenamento de resposta da inteligencia artificial |
| **Dados Tratados** | Resposta gerada pela IA (texto com referencias cientificas verificadas), quantidade de tokens utilizados, identificacao do modelo de IA |
| **Categoria dos Dados** | Dados de saude derivados (sensiveis); dados tecnicos de processamento |
| **Categoria dos Titulares** | Profissionais de saude (destinatarios da resposta) |
| **Finalidade** | Suporte ao diagnostico medico com referencias verificadas e explicabilidade |
| **Base Legal** | Art. 11, inciso II, alinea "g" -- Tutela da saude; Art. 20 -- Direito a explicacao sobre decisoes automatizadas |
| **Destinatarios/Compartilhamento** | Tabela `messages` (armazenamento da resposta); PubMed E-utilities (verificacao de referencias cientificas -- nenhum dado pessoal e transmitido ao PubMed) |
| **Transferencia Internacional** | PubMed/NCBI (EUA) -- recebe apenas identificadores de artigos cientificos, sem dados pessoais |
| **Prazo de Retencao** | Duracao do programa Sandbox Regulatorio, acrescido de 1 (um) ano |
| **Medidas de Seguranca** | Verificacao NTAV (Nao Treinamento, Alucinacao e Verificacao) das referencias cientificas; disclaimer obrigatorio em todas as respostas; log de explicabilidade conforme Art. 20; Row Level Security (RLS) |

---

### 3.6. Log de Acesso (Login/Logout)

| Campo | Descricao |
|---|---|
| **Operacao** | Registro de eventos de autenticacao e sessao |
| **Dados Tratados** | Identificador do usuario (user_id), acao realizada (login/logout), endereco IP, user agent do navegador, geolocalizacao aproximada, duracao da sessao |
| **Categoria dos Dados** | Dados de identificacao e metadados de sessao |
| **Categoria dos Titulares** | Profissionais de saude (medicos) |
| **Finalidade** | Seguranca do sistema e conformidade com o Marco Civil da Internet (Lei n. 12.965/2014, Art. 15) |
| **Base Legal** | Art. 7, inciso II -- Cumprimento de obrigacao legal ou regulatoria pelo controlador |
| **Destinatarios/Compartilhamento** | Tabela `access_logs` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | Minimo de 6 (seis) meses, conforme Art. 15 do Marco Civil da Internet |
| **Medidas de Seguranca** | Registros imutaveis (vedada alteracao ou exclusao); acesso restrito via service_role; criptografia em repouso; auditoria automatica |

---

### 3.7. Log de Auditoria (ROPA Automatizado)

| Campo | Descricao |
|---|---|
| **Operacao** | Registro automatizado de todas as acoes relevantes para fins de auditoria e ROPA em tempo real |
| **Dados Tratados** | Identificador do usuario (user_id), acao realizada, recurso acessado, detalhes da operacao (formato JSONB), endereco IP, user agent do navegador |
| **Categoria dos Dados** | Dados de auditoria e rastreabilidade |
| **Categoria dos Titulares** | Profissionais de saude (medicos); administradores do sistema |
| **Finalidade** | Manutencao de ROPA em tempo real conforme Art. 37 da LGPD; rastreabilidade completa de operacoes de tratamento |
| **Base Legal** | Art. 7, inciso II -- Cumprimento de obrigacao legal ou regulatoria pelo controlador |
| **Destinatarios/Compartilhamento** | Tabela `audit_logs` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | 5 (cinco) anos |
| **Medidas de Seguranca** | Registros IMUTAVEIS implementados via RULES de banco de dados (no_update, no_delete); triggers automaticos para captura de eventos; acesso restrito via service_role; criptografia em repouso |

---

### 3.8. Log de Anonimizacao

| Campo | Descricao |
|---|---|
| **Operacao** | Registro detalhado do processo de anonimizacao de dados clinicos |
| **Dados Tratados** | Hash SHA-256 do texto original, entidades detectadas (categorias, sem conteudo), metodo de anonimizacao aplicado, tempo de processamento |
| **Categoria dos Dados** | Dados tecnicos de anonimizacao (metadados) |
| **Categoria dos Titulares** | Nao aplicavel diretamente (registros referem-se ao processo, nao ao titular) |
| **Finalidade** | Comprovacao da efetiva anonimizacao dos dados conforme Art. 12 da LGPD |
| **Base Legal** | Art. 7, inciso II -- Cumprimento de obrigacao legal ou regulatoria pelo controlador |
| **Destinatarios/Compartilhamento** | Tabela `anonymization_logs` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | 5 (cinco) anos |
| **Medidas de Seguranca** | Registros imutaveis (vedada alteracao ou exclusao); acesso restrito via service_role; armazenamento apenas de hashes e metadados (nenhum dado pessoal e retido no log) |

---

### 3.9. Requisicao de Direitos do Titular

| Campo | Descricao |
|---|---|
| **Operacao** | Recepcao, processamento e acompanhamento de requisicoes de exercicio de direitos pelo titular |
| **Dados Tratados** | Tipo de pedido (acesso, correcao, exclusao, portabilidade, entre outros), descricao da solicitacao, status do atendimento, prazo limite (15 dias uteis conforme Art. 18, paragrafo 5) |
| **Categoria dos Dados** | Dados de requisicao e acompanhamento |
| **Categoria dos Titulares** | Profissionais de saude (medicos) titulares dos dados |
| **Finalidade** | Garantir o exercicio dos direitos do titular previstos no Art. 18 da LGPD |
| **Base Legal** | Art. 18 -- Direitos do titular dos dados pessoais |
| **Destinatarios/Compartilhamento** | Tabela `data_subject_requests` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | 5 (cinco) anos apos a conclusao do atendimento |
| **Medidas de Seguranca** | Row Level Security (RLS) -- titular acessa apenas suas proprias requisicoes; calculo automatico de deadline (15 dias uteis); tracking de status com historico completo; notificacoes automaticas de prazo |

---

### 3.10. Log de Explicabilidade

| Campo | Descricao |
|---|---|
| **Operacao** | Registro de informacoes de explicabilidade das decisoes automatizadas da IA |
| **Dados Tratados** | Modelo de IA utilizado, nivel de explicacao fornecido, conteudo explicativo gerado, indice de confianca da resposta, texto do disclaimer |
| **Categoria dos Dados** | Dados de explicabilidade e transparencia algoritmica |
| **Categoria dos Titulares** | Profissionais de saude (medicos) destinatarios das respostas da IA |
| **Finalidade** | Garantir transparencia e explicabilidade das decisoes automatizadas conforme Art. 20 da LGPD |
| **Base Legal** | Art. 20 -- Direito do titular de solicitar revisao de decisoes tomadas unicamente com base em tratamento automatizado |
| **Destinatarios/Compartilhamento** | Tabela `explainability_logs` no banco de dados |
| **Transferencia Internacional** | Nao aplicavel |
| **Prazo de Retencao** | 5 (cinco) anos |
| **Medidas de Seguranca** | Row Level Security (RLS) -- medico acessa exclusivamente seus proprios registros; insercao restrita via service_role; registros imutaveis; rastreabilidade completa do processo decisorio da IA |

---

## 4. Fluxo de Dados -- Visao Geral

```
Medico (Titular)
    |
    v
[1. Cadastro] --> Supabase Auth + tabela profiles
    |
    v
[2. Consentimento] --> tabela consent_records (imutavel)
    |
    v
[3. Mensagem Clinica] --> Anonimizacao (NER+REGEX)
    |                          |
    |                          v
    |                   [8. Log Anonimizacao] --> tabela anonymization_logs
    |
    v
[Texto Anonimizado] --> API Anthropic (Claude Opus 4.6)
    |
    v
[5. Resposta IA] --> Verificacao PubMed --> tabela messages
    |
    v
[10. Explicabilidade] --> tabela explainability_logs
    |
    v
[6. Log Acesso] --> tabela access_logs
[7. Log Auditoria] --> tabela audit_logs (ROPA automatizado)
[9. Direitos Titular] --> tabela data_subject_requests
```

Para imagens medicas:
```
Medico (Titular)
    |
    v
[4. Imagem Medica] --> Processamento em memoria (NUNCA armazenada)
    |                       |
    |                       v
    |                  API Anthropic (memoria volatil)
    |                       |
    |                       v
    |                  Secure Wipe -- fill(0) + Log de descarte
    |
    v
[5. Resposta IA] --> (fluxo identico ao texto)
```

---

## 5. Resumo das Medidas Tecnicas e Organizacionais

### 5.1. Medidas Tecnicas

| Medida | Descricao | Operacoes Aplicaveis |
|---|---|---|
| **Criptografia em transito (TLS 1.2+)** | Todas as comunicacoes entre cliente, servidor e servicos externos sao criptografadas | Todas |
| **Hash bcrypt** | Senhas armazenadas exclusivamente em formato hash irreversivel | 3.1 (Cadastro) |
| **Hash SHA-256** | Garantia de integridade e rastreabilidade sem reversibilidade | 3.3, 3.4, 3.8 |
| **Anonimizacao NER + REGEX** | Remocao de identificadores pessoais antes do processamento por IA | 3.3 (Mensagem Clinica) |
| **Row Level Security (RLS)** | Isolamento de dados por usuario no nivel do banco de dados | 3.1, 3.2, 3.3, 3.5, 3.9, 3.10 |
| **Registros imutaveis** | Triggers e RULES impedindo alteracao ou exclusao de logs | 3.2, 3.6, 3.7, 3.8, 3.10 |
| **Secure wipe -- fill(0)** | Sobrescrita segura de dados em memoria apos processamento | 3.4 (Imagem Medica) |
| **Validacao magic bytes** | Verificacao de integridade e tipo real de arquivos de imagem | 3.4 (Imagem Medica) |
| **Verificacao NTAV de referencias** | Validacao de referencias cientificas contra PubMed para prevencao de alucinacoes | 3.5 (Resposta IA) |
| **Service role isolation** | Logs criticos acessiveis apenas via service_role (nao via API publica) | 3.6, 3.7, 3.8, 3.10 |

### 5.2. Medidas Organizacionais

| Medida | Descricao |
|---|---|
| **Privacy by Design e by Default** | Privacidade incorporada desde a concepcao do sistema, com configuracoes padrao restritivas |
| **Principio da minimizacao** | Coleta e armazenamento apenas dos dados estritamente necessarios para cada finalidade |
| **Disclaimer obrigatorio** | Todas as respostas da IA incluem aviso de que nao substituem o julgamento clinico do profissional |
| **Controle de acesso baseado em funcoes** | Segregacao de acessos conforme perfil do usuario |
| **Revisoes periodicas** | ROPA revisado semestralmente ou quando houver alteracao significativa no tratamento |
| **Treinamento e conscientizacao** | Capacitacao dos profissionais envolvidos no tratamento de dados |
| **Plano de resposta a incidentes** | Procedimentos definidos para comunicacao a ANPD e titulares em caso de incidente de seguranca (Art. 48) |
| **Gestao de fornecedores** | Avaliacao e monitoramento de operadores (Supabase, Anthropic) quanto a conformidade com a LGPD |

---

## 6. Transferencias Internacionais de Dados

| Operador | Pais | Dados Transferidos | Salvaguardas |
|---|---|---|---|
| **Anthropic (Claude Opus 4.6)** | Estados Unidos | Texto clinico ANONIMIZADO; imagens medicas (processamento volatil) | Clausulas contratuais padrao; dados anonimizados conforme Art. 12; processamento volatil sem retencao |
| **Supabase (AWS)** | Estados Unidos | Dados cadastrais; registros do sistema | Clausulas contratuais padrao; criptografia em repouso e em transito; RLS |
| **PubMed/NCBI** | Estados Unidos | Identificadores de artigos cientificos (NENHUM dado pessoal) | Nao aplicavel -- nenhum dado pessoal e transmitido |

---

## 7. Direitos dos Titulares (Art. 18)

O sistema implementa mecanismos para o exercicio dos seguintes direitos:

| Direito | Implementacao no StaiDOC |
|---|---|
| **Confirmacao de tratamento (Art. 18, I)** | Consulta via tabela `data_subject_requests` |
| **Acesso aos dados (Art. 18, II)** | Exportacao dos dados do titular em formato estruturado |
| **Correcao (Art. 18, III)** | Atualizacao de dados cadastrais via perfil |
| **Anonimizacao, bloqueio ou eliminacao (Art. 18, IV)** | Procedimento de exclusao com cascata controlada |
| **Portabilidade (Art. 18, V)** | Exportacao em formato interoperavel |
| **Eliminacao de dados consentidos (Art. 18, VI)** | Revogacao de consentimento com exclusao dos dados associados |
| **Informacao sobre compartilhamento (Art. 18, VII)** | Documentado neste ROPA e disponivel ao titular |
| **Revogacao do consentimento (Art. 18, IX)** | Mecanismo de revogacao com registro em `consent_records` |
| **Revisao de decisoes automatizadas (Art. 20)** | Log de explicabilidade acessivel ao medico; mecanismo de solicitacao de revisao |

**Prazo de atendimento:** 15 (quinze) dias uteis, conforme Art. 18, paragrafo 5, da LGPD.

---

## 8. Disposicoes Finais

O presente Registro de Operacoes de Tratamento de Dados Pessoais (ROPA) foi elaborado em conformidade com o Art. 37 da Lei n. 13.709/2018 (LGPD) e sera revisado:

- **Semestralmente**, de forma ordinaria;
- **Imediatamente**, quando houver alteracao significativa nas operacoes de tratamento;
- **Sob demanda**, quando solicitado pela Autoridade Nacional de Protecao de Dados (ANPD).

Este documento integra a documentacao obrigatoria do projeto StaiDOC no ambito do Sandbox Regulatorio da ANPD (Edital 02/2025) e deve ser mantido atualizado durante todo o periodo de participacao no programa.

---

**Documento elaborado por:** Equipe de Compliance e Protecao de Dados -- Prevvine Tratamento de Dados Ltda.

**Data:** 14 de fevereiro de 2026

**Proxima revisao programada:** 14 de agosto de 2026
