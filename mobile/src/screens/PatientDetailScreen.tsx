import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { api } from "../api";
import { PacienteSaida, LeituraSaida } from "../types";
import { colors, riskColor } from "../theme";

interface Props {
  patient: PacienteSaida;
  onBack: () => void;
  onOpenAssistant: (id: number) => void;
}

export default function PatientDetailScreen({ patient, onBack, onOpenAssistant }: Props) {
  const [hist, setHist] = useState<LeituraSaida[]>([]);
  const [metric, setMetric] = useState<"fc" | "temp">("fc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .getHistorico(patient.id)
        .then((h) => {
          if (alive) {
            setHist(h);
            setLoading(false);
          }
        })
        .catch(() => alive && setLoading(false));
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [patient.id]);

  const latest = hist.length ? hist[hist.length - 1] : null;
  const values = hist.map((r) => (metric === "fc" ? r.fc : r.temperatura)).slice(-40);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;
  const riscoPct = latest ? Math.round(latest.pontuacao_risco * 100) : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Voltar ao painel</Text>
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <Text style={styles.nome}>{patient.nome}</Text>
        <Text style={styles.meta}>
          {patient.idade} anos · {patient.sexo === "F" ? "Feminino" : patient.sexo === "M" ? "Masculino" : "—"} · Prontuário #{patient.id * 1000 + 49}
        </Text>
        <Text style={styles.obs}>{patient.observacoes || "Sem observações no prontuário."}</Text>
      </View>

      {latest && (
        <View style={[styles.riskCard, { borderColor: riskColor(latest.nivel_risco) }]}>
          <Text style={styles.riskPct}>{riscoPct}%</Text>
          <Text style={[styles.riskNivel, { color: riskColor(latest.nivel_risco) }]}>
            RISCO {latest.nivel_risco.toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLbl}>ÚLTIMA FC</Text>
          <Text style={styles.miniVal}>
            {latest ? `${latest.fc}` : "--"}
            <Text style={styles.miniUnit}> bpm</Text>
          </Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLbl}>ÚLTIMA TEMP</Text>
          <Text style={styles.miniVal}>
            {latest ? `${latest.temperatura}` : "--"}
            <Text style={styles.miniUnit}> °C</Text>
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <Text style={styles.chartTitle}>Histórico de telemetria</Text>
          <View style={styles.toggle}>
            <TouchableOpacity onPress={() => setMetric("fc")} style={[styles.toggleBtn, metric === "fc" && styles.toggleOn]}>
              <Text style={[styles.toggleTxt, metric === "fc" && styles.toggleTxtOn]}>FC</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMetric("temp")} style={[styles.toggleBtn, metric === "temp" && styles.toggleOn]}>
              <Text style={[styles.toggleTxt, metric === "temp" && styles.toggleTxtOn]}>Temp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.rose} style={{ marginVertical: 40 }} />
        ) : values.length === 0 ? (
          <Text style={styles.noData}>Sem histórico. Ligue o emulador no painel (ou rode o Wokwi).</Text>
        ) : (
          <>
            <View style={styles.bars}>
              {values.map((v, i) => {
                const barH = 12 + ((v - min) / range) * 130;
                return (
                  <View
                    key={i}
                    style={[styles.bar, { height: barH, backgroundColor: metric === "fc" ? colors.rose : colors.blue }]}
                  />
                );
              })}
            </View>
            <Text style={styles.chartFoot}>
              mín {Math.round(min * 10) / 10} · máx {Math.round(max * 10) / 10} · {values.length} leituras
            </Text>
          </>
        )}
      </View>

      {latest && (
        <View style={styles.recoCard}>
          <Text style={styles.recoLbl}>Recomendação (motor preditivo · Fase 6)</Text>
          <Text style={styles.recoTxt}>{latest.recomendacao}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.assistBtn} onPress={() => onOpenAssistant(patient.id)} activeOpacity={0.85}>
        <Text style={styles.assistTxt}>Consultar MédicIA sobre este paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  back: { color: colors.rose, fontWeight: "700", fontSize: 13, marginBottom: 12 },

  headerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  nome: { color: colors.white, fontWeight: "800", fontSize: 18 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  obs: { color: colors.textDim, fontSize: 12, marginTop: 10, fontStyle: "italic", backgroundColor: colors.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },

  riskCard: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12, alignItems: "center" },
  riskPct: { color: colors.white, fontSize: 34, fontWeight: "800" },
  riskNivel: { fontSize: 11, fontWeight: "800", marginTop: 2 },

  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  miniCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  miniLbl: { color: colors.textFaint, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  miniVal: { color: colors.white, fontSize: 26, fontWeight: "800", marginTop: 6 },
  miniUnit: { color: colors.textDim, fontSize: 12, fontWeight: "700" },

  chartCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 12 },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  chartTitle: { color: colors.text, fontWeight: "700", fontSize: 13 },
  toggle: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  toggleOn: { backgroundColor: colors.surface2 },
  toggleTxt: { color: colors.textDim, fontWeight: "700", fontSize: 12 },
  toggleTxtOn: { color: colors.rose },
  noData: { color: colors.textDim, textAlign: "center", marginVertical: 30, fontSize: 12 },
  bars: { height: 150, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, minWidth: 2 },
  chartFoot: { color: colors.textFaint, fontSize: 10, marginTop: 10, textAlign: "center", fontVariant: ["tabular-nums"] },

  recoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 12 },
  recoLbl: { color: colors.textFaint, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  recoTxt: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 19 },

  assistBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  assistTxt: { color: colors.blue, fontWeight: "700", fontSize: 13 },
});
