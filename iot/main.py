# CardioIA - Fase 7 / IoT (MicroPython, ESP32)
#
# Le FC (potenciometro) e temperatura (DHT22), envia ao backend em /telemetria e
# mostra o risco devolvido pelo backend no OLED + LED embutido (GPIO2).
# Conversao da logica de sensores de C/C++ para MicroPython (requisito da Fase 7).
#
# Notas importantes (aprendidas testando no Wokwi):
#   * Os pinos GPIO do ESP32 no Wokwi sao "22","21","34","15"... (numero puro, sem
#     prefixo "D") e o serial e "TX"/"RX" -- ver diagram.json.
#   * Use SoftI2C (o I2C de hardware pode travar no simulador).
#   * O driver ssd1306 esta embutido (inline) abaixo -- dispensa lib/arquivo extra
#     (o "Library Manager" do Wokwi e so para libs Arduino/C++, nao MicroPython).
#   * No editor do Wokwi, use Stop e depois Run (o botao Restart nao recarrega o
#     codigo). A aba precisa ficar VISIVEL (o navegador estrangula abas em 2o plano).

from micropython import const
import framebuf
import time
import random
import network
import ujson
from machine import ADC, Pin, SoftI2C
import dht

try:
    import urequests as requests
except ImportError:  # MicroPython mais novo expoe como "requests"
    import requests


# ----------------- Driver SSD1306 (inline) -----------------
SET_CONTRAST = const(0x81)
SET_ENTIRE_ON = const(0xA4)
SET_NORM_INV = const(0xA6)
SET_DISP = const(0xAE)
SET_MEM_ADDR = const(0x20)
SET_COL_ADDR = const(0x21)
SET_PAGE_ADDR = const(0x22)
SET_DISP_START_LINE = const(0x40)
SET_SEG_REMAP = const(0xA0)
SET_MUX_RATIO = const(0xA8)
SET_COM_OUT_DIR = const(0xC0)
SET_DISP_OFFSET = const(0xD3)
SET_COM_PIN_CFG = const(0xDA)
SET_DISP_CLK_DIV = const(0xD5)
SET_PRECHARGE = const(0xD9)
SET_VCOM_DESEL = const(0xDB)
SET_CHARGE_PUMP = const(0x8D)


class SSD1306(framebuf.FrameBuffer):
    def __init__(self, width, height, external_vcc):
        self.width = width
        self.height = height
        self.external_vcc = external_vcc
        self.pages = self.height // 8
        self.buffer = bytearray(self.pages * self.width)
        super().__init__(self.buffer, self.width, self.height, framebuf.MONO_VLSB)
        self.init_display()

    def init_display(self):
        for cmd in (
            SET_DISP | 0x00, SET_MEM_ADDR, 0x00, SET_DISP_START_LINE | 0x00,
            SET_SEG_REMAP | 0x01, SET_MUX_RATIO, self.height - 1,
            SET_COM_OUT_DIR | 0x08, SET_DISP_OFFSET, 0x00, SET_COM_PIN_CFG,
            0x02 if self.width > 2 * self.height else 0x12, SET_DISP_CLK_DIV, 0x80,
            SET_PRECHARGE, 0x22 if self.external_vcc else 0xF1, SET_VCOM_DESEL, 0x30,
            SET_CONTRAST, 0xFF, SET_ENTIRE_ON, SET_NORM_INV, SET_CHARGE_PUMP,
            0x10 if self.external_vcc else 0x14, SET_DISP | 0x01,
        ):
            self.write_cmd(cmd)
        self.fill(0)
        self.show()

    def show(self):
        x0, x1 = 0, self.width - 1
        if self.width == 64:
            x0 += 32
            x1 += 32
        self.write_cmd(SET_COL_ADDR)
        self.write_cmd(x0)
        self.write_cmd(x1)
        self.write_cmd(SET_PAGE_ADDR)
        self.write_cmd(0)
        self.write_cmd(self.pages - 1)
        self.write_data(self.buffer)


class SSD1306_I2C(SSD1306):
    def __init__(self, width, height, i2c, addr=0x3C, external_vcc=False):
        self.i2c = i2c
        self.addr = addr
        self.temp = bytearray(2)
        self.write_list = [b"@", None]  # b"\x40" = prefixo de dados
        super().__init__(width, height, external_vcc)

    def write_cmd(self, cmd):
        self.temp[0] = 0x80
        self.temp[1] = cmd
        self.i2c.writeto(self.addr, self.temp)

    def write_data(self, buf):
        self.write_list[1] = buf
        self.i2c.writevto(self.addr, self.write_list)


# ----------------- CONFIG (edite para o seu backend) -----------------
BACKEND_URL = "https://SEU-BACKEND.trycloudflare.com"  # hostname HTTPS do Cloudflare Tunnel
DEVICE_TOKEN = "COLE_O_DEVICE_TOKEN_AQUI"              # = DEVICE_TOKEN do backend
PACIENTE_ID = 1
SEND_INTERVAL = 3                                      # segundos entre envios
WIFI_SSID = "Wokwi-GUEST"
WIFI_PASS = ""
# ---------------------------------------------------------------------

i2c = SoftI2C(scl=Pin(22), sda=Pin(21))
oled = SSD1306_I2C(128, 64, i2c)
sensor = dht.DHT22(Pin(15))
led = Pin(2, Pin.OUT)  # LED embutido do ESP32 (GPIO2)
pot = ADC(Pin(34))
try:
    pot.atten(ADC.ATTN_11DB)  # faixa completa ~0..3.3V
except Exception:
    pass

# Estado do random walk: os valores caminham suavemente entre leituras (ruido +
# picos ocasionais), entao a demo "vive" sozinha mesmo sem mexer nos sensores.
_fc_state = 75.0
_temp_state = 36.6


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        oled.fill(0)
        oled.text("CardioIA", 0, 0)
        oled.text("Conectando WiFi", 0, 24)
        oled.show()
        wlan.connect(WIFI_SSID, WIFI_PASS)
        while not wlan.isconnected():
            time.sleep(0.3)
    print("WiFi conectado:", wlan.ifconfig()[0])


def ler_fc():
    # O potenciometro define o CENTRO (45..170 bpm); a leitura caminha em torno
    # dele com ruido + picos ocasionais -> varia sozinha, mas o pot ainda manda.
    global _fc_state
    try:
        raw, maxv = pot.read(), 4095
    except AttributeError:
        raw, maxv = pot.read_u16(), 65535
    centro = 45 + (raw / maxv) * (170 - 45)
    _fc_state += random.uniform(-4, 4)
    if random.random() < 0.12:
        _fc_state += random.choice((-1, 1)) * random.uniform(15, 40)
    _fc_state += (centro - _fc_state) * 0.2
    _fc_state = max(40.0, min(180.0, _fc_state))
    return round(_fc_state, 1)


def ler_temperatura():
    # O DHT22 define o centro se estiver em faixa corporal; senao usa 36.6 (o
    # DHT do Wokwi inicia ~24 C, ambiente). Caminha com ruido + febre ocasional.
    global _temp_state
    try:
        sensor.measure()
        centro = sensor.temperature()
    except Exception:
        centro = 36.6
    if centro < 34.0 or centro > 42.0:
        centro = 36.6
    _temp_state += random.uniform(-0.15, 0.15)
    if random.random() < 0.07:
        _temp_state += random.uniform(0.4, 1.4)
    _temp_state += (centro - _temp_state) * 0.2
    _temp_state = max(34.5, min(41.0, _temp_state))
    return round(_temp_state, 1)


def mostrar(fc, temperatura, risco, score):
    oled.fill(0)
    oled.text("CardioIA  P{}".format(PACIENTE_ID), 0, 0)
    oled.text("FC : {} bpm".format(int(fc)), 0, 18)
    oled.text("Tmp: {} C".format(temperatura), 0, 30)
    oled.text("Risco: {}".format(risco), 0, 48)
    oled.text("{}%".format(int(score * 100)), 96, 48)
    oled.show()


def enviar_leitura(fc, temperatura):
    url = BACKEND_URL.rstrip("/") + "/telemetria"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + DEVICE_TOKEN,
    }
    body = ujson.dumps({"paciente_id": PACIENTE_ID, "fc": fc, "temperatura": temperatura})
    resp = requests.post(url, data=body, headers=headers)
    try:
        return resp.json()
    finally:
        resp.close()


def sinalizar_risco(risco):
    if risco == "alto":
        for _ in range(6):
            led.value(1)
            time.sleep(0.08)
            led.value(0)
            time.sleep(0.08)
    elif risco == "medio":
        led.value(1)
    else:
        led.value(0)


def main():
    connect_wifi()
    while True:
        fc = ler_fc()
        temperatura = ler_temperatura()
        risco, score = "?", 0.0
        try:
            data = enviar_leitura(fc, temperatura)
            risco = data.get("nivel_risco", "?")
            score = data.get("pontuacao_risco", 0.0)
            print("FC", fc, "Temp", temperatura, "->", risco, "({:.0f}%)".format(score * 100))
        except Exception as exc:
            print("Erro ao enviar telemetria:", exc)
            oled.fill(0)
            oled.text("Erro backend", 0, 0)
            oled.text(str(exc)[:16], 0, 16)
            oled.show()
            time.sleep(SEND_INTERVAL)
            continue
        sinalizar_risco(risco)
        mostrar(fc, temperatura, risco, score)
        time.sleep(SEND_INTERVAL)


main()
