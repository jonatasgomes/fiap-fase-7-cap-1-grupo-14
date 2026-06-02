# Ir Além 1 — Mineração de Processos e Conformidade Clínica (AIRPA)

**CardioIA · Fase 7 — Coração sob Controle · GRUPO 14**
Protocolo auditado: **Infarto Agudo do Miocárdio com Supra de ST (IAMCSST)**

## 1. Contexto e objetivo

No manejo do IAM vale o princípio *"time is muscle"*: a diretriz da **Sociedade Brasileira de Cardiologia** estabelece a meta de **Tempo Porta-ECG < 10 minutos** (intervalo entre a admissão e o primeiro eletrocardiograma). Este estudo aplica **Process Mining** com a biblioteca **`pm4py`** (descoberta indutiva, Grafo de Dependência Direcionada e *Token Replay*) sobre o *event log* do atendimento para **descobrir o processo real**, **medir a conformidade** contra o protocolo padrão-ouro e **quantificar o impacto clínico** dos gargalos.

> **Dados:** 10.000 casos únicos / 67.200 eventos — **100% sintéticos**, gerados por modelagem estocástica para fins de simulação (não são dados reais de pacientes).

## 2. Variantes de processo descobertas

A mineração da sequência cronológica de eventos revelou **4 variantes (rotas)** coexistentes:

| Variante | Perfil clínico / operacional | Casos | Freq. | Conformidade |
|---|---|---:|---:|---|
| **Rota 1** | Linha de diretriz padrão-ouro (gabarito) | 6.000 | 60% | Conforme |
| **Rota 2** | Inversão justificada (paciente crítico, "porta aberta") | 800 | 8% | Exceção médica validada |
| **Rota 3** | Gargalo crônico por falha de infraestrutura | 2.000 | 20% | Inconforme (atraso severo) |
| **Rota 4** | Omissão crítica de exame (ECG) | 1.200 | 12% | Inconforme (violação grave) |

**Assinaturas de sequência:**

- **Rota 1 (ideal):** Admissão → Triagem → ECG → Laudo → Protocolo IAM → Cateterismo → UTI.
- **Rota 2 (código vermelho):** ECG **antes** da triagem documental (urgência extrema).
- **Rota 3 (retenção logística):** insere o estado *"Aguardando aparelho de ECG"* antes do exame.
- **Rota 4 (tratamento empírico):** **omite** a realização e a interpretação do ECG.

## 3. Performance e impacto clínico dos gargalos

O Grafo Direcionado de Dependência (DFG) configurado para desempenho expôs a fricção severa da **Rota 3** (2.000 pacientes), que rompe a janela terapêutica de proteção miocárdica:

- **Gargalo 1 — Admissão → Triagem de risco:** atraso médio de **45 min**. A retenção administrativa anula a utilidade da classificação de risco e eleva o risco de complicações em síndromes coronarianas agudas.
- **Gargalo 2 — Aguardando ECG → Realização do ECG:** retenção média de **40 min**. A auditoria confirmou que **25% dos pacientes que realizaram ECG (2.000 de 8.000)** ficaram **acima da meta de 10 minutos**.

## 4. Verificação de conformidade (Token Replay)

Confrontando todo o log operacional contra a Rede de Petri formal — construída de forma indutiva a partir da Rota 1:

- **Fitness geral: 97%** — estruturalmente, o paciente quase sempre chega ao desfecho correto (Cateterismo/UTI).
- **Inconformidade global: 32% (3.200 casos = Rotas 3 + 4)** divergem da diretriz de excelência.
- **Alerta clínico:** o fitness alto **mascara microvariantes perigosas**. A **Rota 4 (1.200 casos)** submete pacientes ao protocolo invasivo de IAM **sem confirmação por ECG** — erro assistencial grave, associado a risco de mortalidade.

## 5. Conclusão

O Process Mining converteu 67.200 eventos em diagnóstico acionável: embora o desfecho final seja majoritariamente correto (fitness de 97%), **1 em cada 3 atendimentos desvia do padrão-ouro**. As prioridades de melhoria são claras — **eliminar a retenção logística do ECG (Rota 3)**, que rompe a janela terapêutica, e **bloquear o avanço do protocolo de IAM sem ECG (Rota 4)**. O pipeline `pm4py` valida-se como ferramenta de **auditoria contínua de conformidade clínica**.

---

*Notebook (Colab) e evidências de execução (prints das variantes, DFG, fitness e código): ver [`README.md`](README.md) desta pasta.*
