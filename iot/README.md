# IoT — Sensores em MicroPython (Wokwi)

Simulação do wearable cardíaco da CardioIA em **ESP32 + MicroPython**, conforme a
Fase 7 (conversão da lógica de sensores de C/C++ para MicroPython). O dispositivo
lê sinais simulados, envia ao backend em `POST /telemetria` e exibe no OLED + LED
o **risco calculado pelo backend** — fechando o fluxo fim-a-fim.

## Circuito (`diagram.json`)

| Componente         | GPIO ESP32          | Função                                |
|--------------------|---------------------|---------------------------------------|
| OLED SSD1306 (I2C) | 21 (SDA), 22 (SCL)  | Mostra FC, temperatura e risco        |
| DHT22              | 15 (dados)          | Temperatura (ajustável no Wokwi)      |
| Potenciômetro      | 34 (ADC)            | Simula a frequência cardíaca (FC)     |
| LED embutido       | 2 (GPIO2)           | Feedback de risco (apaga/aceso/pisca) |

O potenciômetro mapeia para **45–170 bpm**; o DHT22 é ajustável pelo painel do
Wokwi. O LED fica **apagado** (baixo), **aceso** (médio) ou **piscando** (alto).

> ⚠️ **Nomes dos pinos no Wokwi (causa raiz de vários bugs):** os GPIO do ESP32 são
> **número puro** (`"22"`, `"21"`, `"34"`, `"15"`, `"2"`) — **não** `"D22"`. O
> serial é `"TX"`/`"RX"` (não `"TX0"`/`"RX0"`). Pino inválido é **descartado em
> silêncio** (o fio simplesmente não aparece), e aí o I2C trava esperando o ACK do
> display que nunca vem. Confira os nomes via `document.querySelector('[id=esp]').pinInfo`.

## Como rodar no Wokwi

1. Em [wokwi.com](https://wokwi.com), crie um projeto **ESP32 → MicroPython**.
2. Cole o conteúdo de `diagram.json` deste diretório na aba *diagram.json*.
3. Cole o conteúdo de `main.py` no `main.py` do projeto. **Não precisa de Library
   Manager:** o driver `ssd1306` está **embutido** (inline) no `main.py` e o
   `urequests` já vem no firmware MicroPython do Wokwi. (O Library Manager do Wokwi
   é só para bibliotecas Arduino/C++ — não MicroPython.)
4. Edite no topo de `main.py`:
   - `BACKEND_URL` → hostname HTTPS do backend (Cloudflare Tunnel).
   - `DEVICE_TOKEN` → igual ao `DEVICE_TOKEN` do backend (⚠️ mantenha o projeto
     **privado** — não use *Share/publish* — para não vazar o token).
   - `PACIENTE_ID` → id do paciente (1, 2 ou 3 nos dados de exemplo).
5. Clique **Stop** e depois ▶️ **Run** (o botão *Restart* **não** recarrega o código
   editado). Mantenha a **aba do Wokwi visível** — o navegador estrangula abas em
   2º plano e a simulação quase congela.
6. O ESP32 conecta no Wi-Fi `Wokwi-GUEST` (acesso real à internet); o OLED mostra
   `CardioIA / Conectando WiFi` e depois a tela com FC, temperatura e risco; o LED
   embutido reage ao nível de risco. Gire o **potenciômetro** para variar a FC.

> **HTTPS:** o Wokwi faz requisições reais à internet, mas precisa de um endpoint
> **HTTPS** público (o navegador/dispositivo recusa cleartext). Use o hostname do
> Cloudflare Tunnel — veja `../backend/README.md`.
>
> **Serial Monitor:** depende dos fios `esp:TX → $serialMonitor:RX` e
> `esp:RX → $serialMonitor:TX` (já no `diagram.json`). Sem eles fica em branco.

## Instabilidade do Wokwi → emulador como fallback

O Wokwi é ótimo para a demonstração, porém instável. Se a simulação cair durante
a gravação do vídeo, use o **emulador** do backend, que posta o **mesmo payload**
no **mesmo** `/telemetria` — a UI se atualiza de forma idêntica:

```bash
python ../backend/emulator/emulate.py --url https://SEU-BACKEND --token <DEVICE_TOKEN>
```

## Link da simulação

Projeto salvo: **`https://wokwi.com/projects/465422293593149441`**
— mantenha **privado** por causa do `DEVICE_TOKEN` embutido na versão que roda.
