# FICHAS A3 E A4 — SANDBOX REGULATORIO ANPD

**Projeto:** StaiDOC — Sandbox ANPD Edital 02/2025
**Empresa:** Prevvine Tratamento de Dados Ltda.
**Data de elaboracao:** Fevereiro de 2026
**Versao:** 1.0

---

# FICHA A3 — COORDENACAO REGULATORIA

## 1. Identificacao do Projeto

| Campo | Descricao |
|-------|-----------|
| Nome do Projeto | StaiDOC |
| Empresa Participante | Prevvine Tratamento de Dados Ltda. |
| Edital de Referencia | Sandbox Regulatorio ANPD — Edital 02/2025 |
| Tema | Inteligencia Artificial aplicada a saude com protecao de dados pessoais sensiveis |
| Periodo de Execucao | Marco a Agosto de 2026 (24 semanas) |

## 2. Equipe Responsavel

| Funcao | Responsavel | Atribuicoes |
|--------|-------------|-------------|
| CEO | Bruno Miolo | Direcao estrategica, relacionamento institucional com ANPD, decisoes de governanca |
| CTO / Equipe Tecnica | Equipe tecnica Prevvine | Arquitetura de sistemas, implementacao de controles tecnicos de privacidade, seguranca da informacao |
| DPO (Encarregado) | A designar | Ponto de contato com ANPD, supervisao de conformidade LGPD, gestao de solicitacoes de titulares |

## 3. Mapeamento Normativo — Artigos LGPD e Componentes Tecnicos

A tabela abaixo relaciona cada dispositivo legal aplicavel ao componente tecnico que o implementa no StaiDOC, demonstrando a abordagem de Privacy by Design adotada pelo projeto.

### 3.1 Lei Geral de Protecao de Dados Pessoais (Lei 13.709/2018)

| Artigo LGPD | Dispositivo | Componente Tecnico Implementador | Descricao da Implementacao |
|--------------|-------------|----------------------------------|---------------------------|
| **Art. 6** | Principios do tratamento de dados | Arquitetura geral do sistema | Finalidade: tratamento restrito a assistencia medica. Adequacao: dados coletados sao compatíveis com a finalidade clinica. Necessidade: coleta minima de dados (principio da minimizacao). Livre acesso: portal do titular com consulta aos proprios dados. Qualidade dos dados: verificacao NTAV de referencias. Transparencia: tags de transparencia em todas as respostas da IA. Seguranca: criptografia, RLS, auditoria. Prevencao: RIPD e monitoramento continuo. Nao discriminacao: auditoria de vies algoritmico. Responsabilizacao: logs imutaveis de todas as operacoes. |
| **Art. 7** | Bases legais para tratamento de dados pessoais | Modulo de consentimento (`consent_records`) | Base legal primaria: consentimento explicito do titular (Art. 7, I). O sistema registra 4 tipos de consentimento obrigatorio (termos de uso, tratamento de dados, uso de IA, imagens medicas), cada um com base legal especifica, timestamp e vinculacao ao titular. |
| **Art. 11** | Tratamento de dados pessoais sensiveis | Modulo de consentimento + politica de dados sensiveis | Para dados de saude (categoria especial), o sistema exige consentimento especifico e destacado (Art. 11, I). O tratamento e restrito a finalidade de tutela da saude do titular (Art. 11, II, f). Dados sensiveis recebem camada adicional de protecao via anonimizacao automatica. |
| **Art. 12** | Anonimizacao de dados pessoais | Modulo de anonimizacao (`anonymization_logs`) | O sistema detecta automaticamente dados pessoais em textos clinicos (nomes, CPF, enderecos, telefones) e os substitui por tokens anonimos antes do processamento pela IA. Cada operacao de anonimizacao e registrada em log auditavel com tipo de dado detectado, metodo aplicado e resultado. O titular e informado via tag [AVISO DE PRIVACIDADE] quando a anonimizacao e acionada. |
| **Art. 18** | Direitos do titular | Portal do titular + APIs de direitos | O sistema implementa os seguintes direitos: confirmacao e acesso aos dados (Art. 18, I e II) via portal do titular; correcao de dados (Art. 18, III) via interface de edicao; anonimizacao, bloqueio ou eliminacao (Art. 18, IV) via solicitacao formal; portabilidade (Art. 18, V) via exportacao em formato estruturado; eliminacao de dados com consentimento (Art. 18, VI) via processo de exclusao; informacao sobre compartilhamento (Art. 18, VII) via log de transparencia; revogacao do consentimento (Art. 18, IX) via painel de consentimentos. |
| **Art. 20** | Explicabilidade de decisoes automatizadas | Modulo de explicabilidade (`explainability_logs`) + tag [HUMAN-IN-THE-LOOP] | Toda resposta gerada pela IA inclui: identificacao do modelo utilizado, nivel de confianca, fontes consultadas, disclaimer obrigatorio e tag [HUMAN-IN-THE-LOOP] indicando que a decisao final e sempre do profissional de saude. O titular pode solicitar revisao de decisoes automatizadas. |
| **Art. 37** | Registro de operacoes de tratamento (ROPA) | Tabelas de auditoria (`audit_logs`, `consent_records`, `anonymization_logs`, `explainability_logs`) | O sistema mantem registro automatico de todas as operacoes de tratamento, incluindo: identidade do agente de tratamento, finalidade, categoria de dados, periodo de retencao, medidas de seguranca e base legal. Os registros sao imutaveis e rastreáveis. |
| **Art. 46** | Medidas de seguranca tecnicas e administrativas | Infraestrutura de seguranca (Supabase RLS, criptografia, autenticacao) | Medidas tecnicas: criptografia em transito (TLS 1.3) e em repouso (AES-256); Row Level Security (RLS) garantindo isolamento de dados entre usuarios; autenticacao multifator; tokens JWT com expiracao curta; sanitizacao de inputs contra injecao. Medidas administrativas: politica de seguranca da informacao, treinamento da equipe, revisoes periodicas de acesso. |
| **Art. 48** | Comunicacao de incidentes de seguranca | Plano de resposta a incidentes | Procedimento documentado para: deteccao de incidentes via monitoramento de logs; avaliacao de gravidade e risco aos titulares; comunicacao a ANPD em prazo razoavel; notificacao aos titulares afetados; medidas de mitigacao e remediacao; registro do incidente e licoes aprendidas. |

### 3.2 Marco Civil da Internet (Lei 12.965/2014)

| Artigo | Dispositivo | Componente Tecnico Implementador | Descricao da Implementacao |
|--------|-------------|----------------------------------|---------------------------|
| **Art. 15** | Guarda de registros de acesso a aplicacoes | Tabela de logs de acesso (`audit_logs`) | O sistema mantem registros de acesso a aplicacao pelo periodo minimo de 6 meses, conforme exigido pela lei. Os logs incluem: identificacao do usuario, data e hora do acesso, endereco IP de origem e acao realizada. Os registros sao armazenados de forma segura e disponibilizados apenas mediante ordem judicial. |

## 4. Cronograma de Execucao

O projeto esta estruturado em 6 ciclos de 4 semanas cada, totalizando 24 semanas de execucao dentro do periodo do Sandbox Regulatorio.

### Ciclo 1 — Fundamentos e Privacy by Design (Semanas 1-4)
**Periodo:** Marco de 2026

| Entrega | Descricao |
|---------|-----------|
| Arquitetura Privacy by Design | Definicao e documentacao da arquitetura do sistema com privacidade incorporada desde a concepcao |
| Modelo de dados com RLS | Implementacao do esquema de banco de dados com Row Level Security habilitado em todas as tabelas sensiveis |
| Modulo de consentimento | Sistema de coleta e registro dos 4 tipos de consentimento obrigatorio com base legal |
| Politica de minimizacao de dados | Regras de coleta minima e retencao proporcional a finalidade |
| Relatorio para ANPD | Relatorio do Ciclo 1 com evidencias de conformidade |

### Ciclo 2 — Transparencia e Explicabilidade (Semanas 5-8)
**Periodo:** Abril de 2026

| Entrega | Descricao |
|---------|-----------|
| 3 niveis de explicabilidade | Implementacao dos niveis basico, detalhado e tecnico de explicacao das respostas da IA |
| Tags de transparencia | Sistema de marcacao automatica com [HUMAN-IN-THE-LOOP], [TRANSPARENCIA] e [AVISO DE PRIVACIDADE] |
| Sistema NTAV | Implementacao do mecanismo Never Trust, Always Verify para verificacao de referencias PubMed |
| Log de explicabilidade | Tabela e interface de consulta dos logs de explicabilidade por medico |
| Relatorio para ANPD | Relatorio do Ciclo 2 com metricas de transparencia |

### Ciclo 3 — Conformidade e Auditoria (Semanas 9-12)
**Periodo:** Maio de 2026

| Entrega | Descricao |
|---------|-----------|
| ROPA automatizado | Registro de operacoes de tratamento com geracao automatica a partir dos logs do sistema |
| Trilha de auditoria completa | Consolidacao de todos os logs (acesso, consentimento, anonimizacao, explicabilidade) em painel unico |
| RIPD (Relatorio de Impacto) | Elaboracao do Relatorio de Impacto a Protecao de Dados Pessoais |
| Revisao de conformidade | Auditoria interna de conformidade com todos os artigos mapeados |
| Relatorio para ANPD | Relatorio do Ciclo 3 com resultados da auditoria |

### Ciclo 4 — Seguranca e Riscos (Semanas 13-16)
**Periodo:** Junho de 2026

| Entrega | Descricao |
|---------|-----------|
| Testes de penetracao | Execucao de testes de seguranca na infraestrutura e aplicacao |
| Plano de resposta a incidentes | Documentacao e simulacao do procedimento de resposta a incidentes (Art. 48) |
| Avaliacao de riscos algoritmicos | Analise de vies e discriminacao nas respostas da IA |
| Hardening de seguranca | Implementacao de medidas adicionais identificadas nos testes |
| Relatorio para ANPD | Relatorio do Ciclo 4 com resultados dos testes de seguranca |

### Ciclo 5 — Direitos dos Titulares e Portabilidade (Semanas 17-20)
**Periodo:** Julho de 2026

| Entrega | Descricao |
|---------|-----------|
| Portal do titular | Interface para exercicio dos direitos previstos no Art. 18 |
| Mecanismo de portabilidade | Exportacao de dados em formato estruturado e interoperavel |
| Processo de eliminacao | Fluxo completo de exclusao de dados com confirmacao e registro |
| Canal de atendimento ao titular | Sistema de recebimento e resposta a solicitacoes de titulares |
| Relatorio para ANPD | Relatorio do Ciclo 5 com metricas de atendimento a titulares |

### Ciclo 6 — Consolidacao e Encerramento (Semanas 21-24)
**Periodo:** Agosto de 2026

| Entrega | Descricao |
|---------|-----------|
| Relatorio final consolidado | Documento compilando todos os resultados, metricas e licoes aprendidas |
| Avaliacao de maturidade | Medicao do nivel de maturidade em protecao de dados alcancado |
| Plano de continuidade | Estrategia para manutencao das praticas apos o encerramento do Sandbox |
| Apresentacao final a ANPD | Apresentacao dos resultados e contribuicoes para a regulamentacao |
| Encerramento formal | Documentacao de encerramento do projeto no Sandbox |

## 5. Governanca e Supervisao

O projeto adota modelo de governanca com tres linhas de defesa:

1. **Primeira linha (operacional):** equipe tecnica responsavel pela implementacao dos controles de privacidade e seguranca no codigo e na infraestrutura.
2. **Segunda linha (conformidade):** DPO (a designar) responsavel pela supervisao continua da conformidade com a LGPD e demais normas aplicaveis, atuando como ponto de contato com a ANPD.
3. **Terceira linha (auditoria):** revisoes periodicas independentes dos controles implementados, com relatorios ao CEO e a ANPD conforme cronograma do Sandbox.

## 6. Comunicacao com a ANPD

A comunicacao com a ANPD seguira os seguintes canais e periodicidades:

- **Relatorios de ciclo:** entregues ao final de cada ciclo de 4 semanas, contendo evidencias de conformidade, metricas e evolucao do projeto.
- **Comunicacoes extraordinarias:** sempre que ocorrer incidente de seguranca relevante, mudanca significativa na arquitetura ou descoberta que impacte a conformidade.
- **Reunioes de acompanhamento:** conforme calendario definido pela ANPD para participantes do Sandbox.

---

# FICHA A4 — TRANSPARENCIA E EXPLICABILIDADE

## 1. Introducao

A transparencia e a explicabilidade sao principios fundamentais do StaiDOC. Em um sistema de inteligencia artificial aplicado a saude, o profissional medico precisa compreender como a IA chegou a determinada resposta, quais fontes foram consultadas e qual o grau de confiabilidade da informacao fornecida. O paciente, como titular dos dados, tem o direito de saber como seus dados sao tratados e de solicitar explicacao sobre decisoes automatizadas que o afetem (Art. 20 da LGPD).

Este documento detalha as medidas de transparencia e explicabilidade implementadas no StaiDOC, organizadas em quatro eixos: niveis de explicabilidade, tags de transparencia, verificacao de referencias e consentimento informado.

## 2. Tres Niveis de Explicabilidade

O StaiDOC implementa um sistema de explicabilidade em tres camadas progressivas, permitindo que diferentes perfis de usuario obtenham o nivel de detalhe adequado as suas necessidades.

### 2.1 Nivel 1 — Basico (Disclaimer na Resposta)

**Publico-alvo:** Todos os usuarios (medicos, profissionais de saude, titulares de dados).

**Descricao:** Toda resposta gerada pela inteligencia artificial inclui, de forma automatica e obrigatoria, um disclaimer informando que:

- A resposta foi gerada por inteligencia artificial;
- A informacao nao substitui o julgamento clinico do profissional de saude;
- A decisao final e sempre do medico responsavel pelo paciente;
- As fontes utilizadas estao disponiveis para consulta.

**Exemplo de disclaimer:**
> "Esta resposta foi gerada por inteligencia artificial e verificada contra fontes cientificas. Ela nao substitui a avaliacao clinica do profissional de saude. A decisao terapeutica final deve ser tomada pelo medico responsavel."

**Objetivo regulatorio:** Garantir que nenhum usuario confunda a saida da IA com uma decisao medica autonoma, atendendo ao principio da transparencia (Art. 6, VI da LGPD) e a exigencia de explicabilidade (Art. 20).

### 2.2 Nivel 2 — Detalhado (Log Completo)

**Status:** Implementado e funcional.

**Publico-alvo:** Medicos e profissionais de saude que desejam compreender o processo completo de geracao da resposta.

**Descricao:** Para cada resposta gerada pela IA, o sistema registra e disponibiliza ao medico um log detalhado contendo:

| Informacao | Descricao |
|------------|-----------|
| Modelo de IA utilizado | Identificacao do modelo (por exemplo, GPT-4, Claude) e versao |
| Parametros de geracao | Temperatura, tokens maximos e demais parametros que influenciam a resposta |
| Anonimizacao aplicada | Indicacao de quais dados pessoais foram detectados e anonimizados antes do envio a IA, com tipo de dado e metodo de anonimizacao |
| Verificacao PubMed | Resultado da verificacao NTAV: referencias citadas, status de validacao (verificada, nao encontrada, parcialmente verificada) e links diretos para os artigos |
| Nivel de confianca | Indicador numerico de confianca da resposta |
| Fontes consultadas | Lista das fontes utilizadas na construcao da resposta |

**Acesso:** O medico pode consultar os logs de explicabilidade das suas proprias consultas a qualquer momento, por meio de interface dedicada. O acesso e restrito ao proprio medico, garantido por Row Level Security (RLS) no banco de dados.

**Objetivo regulatorio:** Permitir que o profissional de saude compreenda integralmente o processo decisorio da IA, habilitando a revisao humana informada e o exercicio do direito previsto no Art. 20 da LGPD.

### 2.3 Nivel 3 — Tecnico (Parametros Completos)

**Status:** Implementado via log.

**Publico-alvo:** Equipe tecnica, auditores e reguladores (ANPD).

**Descricao:** Registro tecnico completo de todos os parametros e metadados envolvidos na geracao de cada resposta, incluindo:

- Configuracao completa do modelo (todos os hiperparametros);
- Prompt de sistema utilizado (com anonimizacao de dados pessoais);
- Cadeia completa de processamento (pre-processamento, anonimizacao, envio, pos-processamento);
- Metricas de desempenho (tempo de resposta, tokens consumidos);
- Versao do sistema e dependencias;
- Hash de integridade do log.

**Acesso:** Restrito a equipe tecnica autorizada e disponivel para auditoria pela ANPD mediante solicitacao formal.

**Objetivo regulatorio:** Prover rastreabilidade tecnica completa para fins de auditoria, fiscalizacao e investigacao de incidentes, conforme Arts. 37 e 46 da LGPD.

## 3. Tags de Transparencia

O StaiDOC utiliza um sistema de tags visuais que sinalizam ao usuario, de forma imediata e intuitiva, aspectos relevantes de transparencia e protecao de dados em cada interacao com a IA.

### 3.1 Tag [HUMAN-IN-THE-LOOP] — Art. 20 da LGPD

**Significado:** Indica que a resposta da IA requer revisao e validacao por um profissional de saude humano antes de qualquer aplicacao clinica.

**Quando aparece:** Em toda resposta gerada pela IA que contenha orientacao clinica, diagnostica ou terapeutica.

**Fundamentacao legal:** Art. 20 da LGPD, que garante ao titular o direito de solicitar revisao de decisoes tomadas unicamente com base em tratamento automatizado de dados pessoais. A tag explicita que o sistema foi projetado para que a decisao final seja sempre humana, e nao automatizada.

**Exemplo de uso:**
> [HUMAN-IN-THE-LOOP] A sugestao a seguir foi gerada por inteligencia artificial. A decisao clinica final deve ser tomada pelo medico responsavel.

### 3.2 Tag [TRANSPARENCIA] — Modelo e Fontes

**Significado:** Identifica o modelo de IA utilizado e as fontes cientificas consultadas na geracao da resposta.

**Quando aparece:** Em toda resposta da IA, acompanhando a indicacao do modelo e das referencias.

**Fundamentacao legal:** Art. 6, VI da LGPD (principio da transparencia) e Art. 20 (direito a explicacao sobre os criterios e procedimentos utilizados para a decisao automatizada).

**Exemplo de uso:**
> [TRANSPARENCIA] Modelo: GPT-4 | Fontes: PubMed (3 referencias verificadas) | Confianca: 87%

### 3.3 Tag [AVISO DE PRIVACIDADE] — Dados Sensiveis Detectados

**Significado:** Alerta o medico de que dados pessoais sensiveis foram detectados no texto e que medidas de protecao foram aplicadas automaticamente.

**Quando aparece:** Sempre que o modulo de anonimizacao detecta dados pessoais (nomes, CPF, enderecos, telefones, outros identificadores) no conteudo enviado para processamento pela IA.

**Fundamentacao legal:** Art. 6, VI (transparencia), Art. 11 (tratamento de dados sensiveis) e Art. 12 (anonimizacao) da LGPD.

**Exemplo de uso:**
> [AVISO DE PRIVACIDADE] Dados pessoais foram detectados e anonimizados antes do processamento pela IA. Tipos anonimizados: nome do paciente, CPF. O conteudo original permanece protegido no prontuario.

## 4. Sistema NTAV — Never Trust, Always Verify

### 4.1 Conceito

O NTAV (Never Trust, Always Verify) e o sistema de verificacao de referencias cientificas do StaiDOC. Ele parte do principio de que nenhuma referencia bibliografica citada pela IA deve ser considerada confiavel ate que seja verificada independentemente em fontes autorizadas.

Modelos de linguagem podem gerar referencias bibliograficas inexistentes ou imprecisas (fenomeno conhecido como "alucinacao"). Em um contexto de saude, uma referencia falsa pode levar a decisoes clinicas equivocadas. O NTAV mitiga esse risco.

### 4.2 Funcionamento

O processo de verificacao segue as seguintes etapas:

1. **Extracao:** O sistema extrai todas as referencias bibliograficas citadas na resposta da IA.
2. **Consulta:** Cada referencia e consultada automaticamente na base de dados PubMed (National Library of Medicine, EUA) por meio de sua API oficial.
3. **Validacao:** Para cada referencia, o sistema verifica: existencia do artigo (PMID valido), correspondencia do titulo, correspondencia dos autores e correspondencia do periodico.
4. **Classificacao:** Cada referencia recebe um status:
   - **Verificada:** artigo encontrado com correspondencia integral;
   - **Parcialmente verificada:** artigo encontrado com correspondencia parcial (por exemplo, titulo similar mas autores divergentes);
   - **Nao encontrada:** artigo nao localizado na base PubMed.
5. **Apresentacao:** O resultado da verificacao e apresentado ao medico no Nivel 2 de explicabilidade, com links clicaveis diretos para os artigos no PubMed.

### 4.3 Relevancia Regulatoria

O NTAV atende ao principio da qualidade dos dados (Art. 6, V da LGPD), garantindo que as informacoes fornecidas pela IA sejam precisas e verificaveis. Tambem contribui para a transparencia (Art. 6, VI) ao permitir que o medico confirme independentemente as fontes citadas.

## 5. Consentimento Informado

### 5.1 Modelo de Consentimento em 4 Tipos

O StaiDOC exige a obtencao de 4 tipos de consentimento, cada um com finalidade e base legal especificas, antes que o titular possa utilizar o sistema. Nenhum dado e tratado sem que todos os consentimentos obrigatorios tenham sido obtidos.

| Tipo de Consentimento | Finalidade | Base Legal LGPD | Obrigatorio |
|-----------------------|------------|-----------------|-------------|
| **Termos de Uso** | Aceitacao das condicoes gerais de utilizacao da plataforma | Art. 7, I (consentimento) | Sim |
| **Tratamento de Dados** | Autorizacao para coleta e tratamento de dados pessoais e dados pessoais sensiveis de saude | Art. 11, I (consentimento especifico e destacado para dados sensiveis) | Sim |
| **Uso de Inteligencia Artificial** | Ciencia e concordancia de que o sistema utiliza IA para gerar sugestoes clinicas, com explicacao dos riscos e limitacoes | Art. 6, VI (transparencia) + Art. 20 (explicabilidade) | Sim |
| **Imagens Medicas** | Autorizacao especifica para processamento de imagens medicas (quando aplicavel), com finalidade restrita ao auxilio diagnostico | Art. 11, I (consentimento especifico) | Sim (quando aplicavel) |

### 5.2 Registro de Consentimento

Cada consentimento obtido e registrado na tabela `consent_records` com as seguintes informacoes:

- Identificacao do titular (vinculada ao perfil do usuario);
- Tipo de consentimento;
- Base legal aplicavel;
- Data e hora da obtencao (timestamp);
- Versao do termo aceito;
- Forma de obtencao (digital, com registro de acao do usuario);
- Status (ativo, revogado).

### 5.3 Revogacao

O titular pode revogar qualquer consentimento a qualquer momento, conforme Art. 8, paragrafo 5 da LGPD. A revogacao e registrada com timestamp e, conforme o tipo de consentimento revogado, pode implicar a suspensao total ou parcial do acesso ao sistema. A revogacao nao afeta a licitude do tratamento realizado anteriormente com base no consentimento.

## 6. Referencias Bibliograficas Verificaveis

Todas as referencias cientificas apresentadas nas respostas da IA incluem links clicaveis diretos para os artigos na base PubMed. Isso permite ao medico:

- Acessar o artigo original com um clique;
- Verificar independentemente o conteudo citado;
- Avaliar a qualidade e relevancia da evidencia para o caso clinico em questao.

**Formato padrao de referencia:**
> Autor(es). Titulo do artigo. Periodico. Ano;Volume(Numero):Paginas. [PubMed: PMID](link direto)

## 7. Log de Explicabilidade

### 7.1 Estrutura da Tabela `explainability_logs`

O registro de explicabilidade e mantido em tabela dedicada no banco de dados, com os seguintes campos principais:

| Campo | Descricao |
|-------|-----------|
| `id` | Identificador unico do registro |
| `user_id` | Identificacao do medico que realizou a consulta |
| `consultation_id` | Vinculacao a consulta clinica associada |
| `model_used` | Modelo de IA utilizado (nome e versao) |
| `confidence_score` | Nivel de confianca da resposta (0 a 100) |
| `disclaimer_shown` | Confirmacao de que o disclaimer foi exibido ao usuario |
| `pubmed_verification` | Resultado da verificacao NTAV (JSON com status de cada referencia) |
| `anonymization_applied` | Indicacao de quais dados foram anonimizados e metodos utilizados |
| `parameters` | Parametros completos de geracao (Nivel 3) |
| `created_at` | Data e hora do registro |

### 7.2 Politica de Acesso

O acesso aos logs de explicabilidade segue o principio do menor privilegio:

- **Medico:** acessa somente os logs das suas proprias consultas, garantido por Row Level Security (RLS) no banco de dados.
- **DPO:** acessa logs agregados e anonimizados para fins de conformidade.
- **Equipe tecnica:** acessa logs completos (Nivel 3) para fins de depuracao e melhoria do sistema, com registro de acesso.
- **ANPD:** acesso mediante solicitacao formal, conforme procedimentos do Sandbox.

## 8. Anonimizacao Transparente

### 8.1 Processo

Quando o modulo de anonimizacao detecta dados pessoais no conteudo submetido para processamento pela IA, o seguinte fluxo e executado:

1. **Deteccao:** Algoritmos de reconhecimento de entidades nomeadas (NER) identificam dados pessoais no texto (nomes, CPF, enderecos, telefones, datas de nascimento, entre outros).
2. **Substituicao:** Os dados identificados sao substituidos por tokens anonimos (por exemplo, "[NOME_PACIENTE]", "[CPF_REMOVIDO]") antes do envio para a IA.
3. **Notificacao:** O medico e informado via tag [AVISO DE PRIVACIDADE], indicando quais tipos de dados foram detectados e anonimizados.
4. **Registro:** A operacao e registrada na tabela `anonymization_logs` com tipo de dado detectado, metodo de anonimizacao aplicado e resultado.
5. **Preservacao:** Os dados originais permanecem protegidos no prontuario eletronico, acessiveis apenas ao medico autorizado via RLS.

### 8.2 Relevancia para o Titular

O titular dos dados tem o direito de saber que seus dados pessoais sao protegidos durante o processamento por IA. A anonimizacao transparente garante que:

- Dados pessoais sensiveis nunca sao enviados em texto claro para modelos de IA externos;
- O medico tem visibilidade sobre quais dados foram protegidos;
- Ha registro auditavel de cada operacao de anonimizacao;
- O titular pode solicitar informacoes sobre o tratamento aplicado aos seus dados (Art. 18, VIII da LGPD).

## 9. Conclusao

As medidas de transparencia e explicabilidade descritas neste documento demonstram o compromisso do StaiDOC com o tratamento responsavel de dados pessoais sensiveis de saude em um contexto de inteligencia artificial. O sistema foi projetado para que:

- O medico sempre saiba como a IA chegou a uma resposta e possa verificar as fontes;
- O titular tenha seus dados protegidos e possa exercer seus direitos;
- O regulador tenha acesso a registros completos e auditaveis de todas as operacoes;
- A decisao clinica final permaneca sempre sob responsabilidade do profissional de saude humano.

Essas medidas serao continuamente aprimoradas ao longo dos 6 ciclos do Sandbox Regulatorio, com relatorios periodicos de evolucao submetidos a ANPD.

---

**Documento elaborado por:** Prevvine Tratamento de Dados Ltda.
**Para submissao a:** Autoridade Nacional de Protecao de Dados (ANPD) — Sandbox Regulatorio Edital 02/2025
