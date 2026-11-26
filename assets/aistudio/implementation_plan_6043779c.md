# Avaliação Geral Centralizada para Eventos com Sub-eventos

Este plano detalha a criação de um modo de **Avaliação Geral** no evento principal, funcionando como um atalho centralizador para que jurados cadastrados uma única vez avaliem equipes de todos os sub-eventos usando exatamente os critérios específicos de cada sub-evento, com diferenciação visual por sub-evento e pela turma do capitão, e com garantias de otimização no consumo do Firebase.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Confirmadas e Análise de Consumo**
> * **Abrangência Automática**: Ao ativar a Avaliação Geral no evento principal, todos os sub-eventos vinculados são carregados automaticamente no painel do avaliador.
> * **Critérios Obrigatórios por Sub-evento**: Cada sub-evento precisa ter seus próprios critérios de avaliação configurados e salvos. O evento principal atua exclusivamente como atalho centralizador de acesso (jurados, PIN e abertura) e não substitui nem cria critérios separados.
> * **Navegação Agrupada + Busca Sem Colisão**: A lista do avaliador mantém a barra de busca por texto existente (garantindo retorno de todas as equipes com o mesmo número entre sub-eventos diferentes) e organiza os resultados em seções agrupadas por sub-evento.
> * **Consumo do Firebase (Leituras e Escritas)**: A arquitetura foi desenhada para **reduzir escritas** no cadastro de jurados e **evitar qualquer proliferação de leituras (N+1 Reads)**. A resolução da turma do capitão utiliza estritamente o `classId` já desnormalizado nos dados da equipe e o cache de turmas, sem realizar consultas na coleção `users`.

* **Decisão Confirmada 1**: Todas as avaliações submetidas pelo atalho centralizado são gravadas diretamente no sub-evento de origem da equipe, preservando apuração, boletim dos alunos e auditoria sem duplicação.
* **Decisão Confirmada 2**: A diferenciação entre equipes de mesma numeração será feita por meio de duas identificações visuais claras em cada cartão: o nome do sub-evento e a turma do capitão.
* **Decisão Confirmada 3**: Otimização estrita de leituras do Firestore garantida através de dados desnormalizados na equipe e `sessionStorage` para metadados de turmas.

---

### 1. Overview & Core Concept

* **O Que Faz**: Permite que um evento principal com sub-eventos em equipe habilite uma configuração de **Avaliação Geral**, gerando um único PIN e um conjunto único de Links Mágicos de jurados que dão acesso unificado às equipes de todos os sub-eventos. Ao selecionar uma equipe, o jurado avalia utilizando a ficha de critérios configurada no sub-evento específico daquela equipe.
* **Público-Alvo / Personas**:
  * **Administradores e Coordenadores**: Configuram os critérios em cada sub-evento normalmente e gerenciam jurados, PIN e status de abertura em um único local no evento principal.
  * **Avaliadores (Jurados Externos ou Internos)**: Recebem um único link ou PIN para percorrer todas as equipes de múltiplos sub-eventos, identificando facilmente equipes de mesma numeração por sub-evento e turma do capitão.
  * **Estudantes**: Continuam visualizando suas notas e feedback normalmente no boletim da equipe dentro do sub-evento correspondente.
* **Valor Principal**: Elimina o retrabalho de cadastrar os mesmos jurados e distribuir múltiplos links por sub-evento, mantendo intactas as rubricas independentes de cada tema/sub-evento e evitando confusão entre equipes homônimas (ex.: duas ou mais "Equipe #1").

---

### 2. User Experience & Visual Design

#### Fluxo do Administrador (Configuração Centralizada)

1. **Acesso pelo Painel de Eventos**: Eventos principais que sejam de equipe — ou que possuam sub-eventos de equipe — exibem o botão de configuração de avaliação na lista administrativa.
2. **Ativação do Modo Centralizado**: Na tela de configuração de avaliação do evento principal (quando houver sub-eventos), um controle permite alternar para **Avaliação Geral dos Sub-eventos**.
3. **Painel de Prontidão dos Sub-eventos**: Em vez de exigir critérios no evento principal, a interface exibe a lista de todos os sub-eventos vinculados com seu status de critérios (quantidade de critérios configurados e peso total). Caso algum sub-evento ainda não possua critérios válidos, exibe um alerta claro e um atalho direto para configurar aquele sub-evento antes de salvar ou abrir a avaliação geral.
4. **Cadastro Único de Banca**: O administrador define o PIN da Banca, ativa ou encerra a avaliação geral e gera os Links Mágicos nominais dos jurados uma única vez no evento principal.

#### Fluxo do Avaliador (Portal Unificado)

1. **Entrada Única**: O jurado acessa via Link Mágico (`?token=...`) ou informa o PIN do evento principal.
2. **Busca Universal entre Sub-eventos**: A barra de busca superior filtra em tempo real por número da equipe (ex.: `#4` ou `4`), nome da equipe, nome do capitão, turma do capitão, título do projeto ou nome do sub-evento. Buscar um número retorna **todas** as equipes com aquele número em diferentes sub-eventos (por exemplo, `Equipe #4` do Sub-evento A e `Equipe #4` do Sub-evento B).
3. **Agrupamento por Sub-evento**: Abaixo da busca, as equipes aparecem agrupadas em seções por sub-evento, com cabeçalho mostrando o nome do sub-evento, a contagem de equipes filtradas e o progresso de avaliação.
4. **Identificação nos Cartões de Equipe**: Cada cartão exibe de forma limpa e escaneável:
   * Título principal com o número/nome da equipe (`Equipe #4`) e título do projeto submetido (se houver);
   * **Identificador do sub-evento** ao qual a equipe pertence;
   * **Identificador da turma do capitão** (ex.: `3º DS-A`), obtida dos metadados da equipe e do catálogo de turmas;
   * Status tabular de avaliação (`Pendente`, `Avaliado · Nota X.X` com `tabular-nums`, ou `Conflito de Interesse`).
5. **Formulário de Notas Contextual**: Ao tocar em uma equipe, o modal abre exibindo os identificadores de sub-evento e turma no cabeçalho, os entregáveis da equipe e **exatamente os critérios definidos no sub-evento daquela equipe**, recalculando a média ponderada conforme os pesos do sub-evento.

---

### 3. Key Product Decisions, Trade-Offs & Impacto no Firebase

#### Análise Comparativa de Leituras e Escritas no Firebase

| Operação | Sistema Atual (Sub-eventos Independentes) | Novo Modelo (Avaliação Geral Centralizada) | Impacto no Firebase |
| :--- | :--- | :--- | :--- |
| **Cadastro de Jurados** | Se há $J$ jurados e $N$ sub-eventos: $J \times N$ escritas em `judge_tokens`. | Cadastro único no evento principal: apenas **$J$ escritas**. | 🟢 **Grande Redução de Escritas** (economiza $(N-1) \times J$ escritas). |
| **Configuração de PIN / Status** | Salvar e abrir avaliações em $N$ sub-eventos: $N$ escritas em `events` e $N$ em `judge_pins`. | Salvar e abrir uma única vez no evento principal: **1 escrita em `events` e 1 em `judge_pins`**. | 🟢 **Redução de Escritas** (economiza $2(N-1)$ escritas). |
| **Submissão de Avaliações** | Cada avaliação enviada gera 1 escrita (create ou update) na coleção `evaluations`. | Cada avaliação enviada continua gerando **1 escrita** na coleção `evaluations`. | ⚪ **Consumo Idêntico de Escritas** (exatamente 1:1 por voto). |
| **Autenticação / Validação do Jurado** | Se o jurado precisa entrar em $N$ sub-eventos: $N$ leituras de token/PIN e $N$ leituras de evento. | O jurado acessa 1 único link: **1 leitura de token/PIN e 1 leitura do evento principal**. | 🟢 **Redução de Leituras de Autenticação** (economiza validações repetidas). |
| **Carregamento de Equipes** | Se o jurado entrava em 1 sub-evento com 10 equipes: lia 10 docs de equipes. Para avaliar os $N$ sub-eventos, lia $10 \times N$ equipes ao longo de $N$ aberturas de página. | Lê todas as equipes dos sub-eventos em uma única tela ($10 \times N$ docs de equipes). | ⚪ **Consumo Equivalente de Leituras de Equipe**, mas realizado em lote único na inicialização do portal. |
| **Resolução da Turma do Capitão** | Se usasse consulta a perfis (`users/{uid}`), geraria $T$ leituras extras (N+1 queries). | **Zero consultas a `users`**: usa `team.membersData` já desnormalizado na equipe cruzado com o catálogo `classes` em cache de `sessionStorage`. | 🟢 **Zero Aumento de Leituras** (evita N+1 reads e previne erros de permissão). |

* **Decisão 1 — Persistência Direta no `eventId` do Sub-evento**:
  As notas continuam sendo salvas diretamente com o `eventId` do sub-evento respectivo. Isso preserva a integridade dos dados e não introduz coleções intermediárias ou escritas adicionais.
* **Decisão 2 — Eliminação de N+1 Reads para a Turma do Capitão**:
  Como jurados externos com Link Mágico ou PIN não possuem permissão para ler a coleção privada de usuários (`users`), qualquer tentativa de buscar o perfil do capitão geraria erro `permission-denied` e consumiria leituras no banco. A resolução da turma é 100% resolvida em memória usando o `classId` da equipe e o cache de `classes`.
* **Decisão 3 — Exigência Estrita de Critérios Próprios nos Sub-eventos**:
  Bloqueia a ativação no evento principal caso algum sub-evento não tenha critérios, garantindo que o jurado não faça submissões inválidas que gerem retrabalho ou gravações inconsistentes.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Diagrama de Arquitetura e Fluxo de Dados

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURAÇÃO ADMINISTRATIVA                          │
│                                                                           │
│  Evento Principal ──▶ [Ativar Avaliação Geral]                            │
│    • PIN único e Links Mágicos dos Jurados (J escritas em vez de J x N)   │
│    • Valida se TODOS os Sub-eventos possuem critérios próprios            │
│    • Exibe status e atalho para configurar cada Sub-evento                │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        PORTAL DO AVALIADOR (ATALHO)                       │
│                                                                           │
│  Autenticação no Evento Principal (1 leitura de Token / PIN)              │
│         │                                                                 │
│         ▼                                                                 │
│  Carregamento Otimizado:                                                  │
│    ├── Sub-eventos vinculados ao Evento Principal (com cache de eventos)  │
│    ├── Equipes de todos os Sub-eventos (1 query por sub-evento)           │
│    ├── Catálogo de Turmas (100% cache em sessionStorage - 0 reads)        │
│    └── Avaliações já enviadas pelo jurado nesses sub-eventos              │
│         │                                                                 │
│         ▼                                                                 │
│  Busca Unificada + Agrupamento por Sub-evento                             │
│    • Cartão exibe: Equipe #N | Tag Sub-evento | Tag Turma do Capitão      │
│    • Clique na equipe abre modal com os critérios do Sub-evento dela      │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      CAMADA DE PERSISTÊNCIA (SERVIÇOS)                    │
│                                                                           │
│  Grava Avaliação com eventId = subEventoDaEquipe.id (1 escrita por voto)  │
│    ├── Reflete no Painel de Apuração (Pai e Sub-evento)                   │
│    └── Reflete no Boletim de Feedback do Estudante                        │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Dados & Otimizações Técnicas

* **Flag `centralizeSubEvents`**:
  Armazenada no `evaluationConfig` do evento pai sem alterar a estrutura global das coleções.
* **Garantia de Zero Leituras em `users`**:
  O componente do jurado recebe o mapa de turmas derivado de `storageService.getClasses()` (que já implementa cache de sessão) e busca `captainMember.classId` em `team.membersData` ou `team.period`. Caso uma equipe antiga não tenha turma, exibe fallback sem acionar o Firestore.
* **Manutenção das Regras de Segurança (`firestore.rules`)**:
  A criação de avaliações em `evaluations` já aceita o envio de notas por avaliadores com Link Mágico ou PIN para o `eventId` correspondente sem necessidade de afrouxar permissões ou criar regras custosas.

#### Sequência de Verificação Planejada

1. **Verificação de Quota e Leituras**: Validar que a abertura da tela do jurado executa apenas as leituras estritamente necessárias (evento pai, sub-eventos, equipes e avaliações do jurado), mantendo 0 leituras na coleção de usuários.
2. **Teste Funcional do Jurado Centralizado**:
   - Criação de equipes de mesma numeração (ex: `Equipe #1`) em sub-eventos distintos;
   - Busca por `#1` retornando ambas as equipes em suas respectivas seções;
   - Exibição correta da tag do sub-evento e da tag da turma do capitão;
   - Avaliação com os critérios específicos de cada sub-evento.
3. **Conferência de Apuração**: Verificar que as notas lançadas aparecem perfeitamente no Painel de Apuração geral e no sub-evento específico.
4. **Build & Lint**: Executar compilação e lint estático para validação final.
