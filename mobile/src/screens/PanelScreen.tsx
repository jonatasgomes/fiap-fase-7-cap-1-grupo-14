import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { PacienteStatus, EmulatorStatus } from "../types";
import { colors, riskColor } from "../theme";

interface Props {
  patients: PacienteStatus[];
  emulador: EmulatorStatus | null;
  onToggleEmulador: (ligar: boolean) => void;
  onSelectPatient: (id: number) => void;
}

function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return "--";
  }
}

export default function PanelScreen({ patients, emulador, onToggleEmulador, onSelectPatient }: Props) {
  const ligado = !!emulador?.ligado;

  const header = (
    <View style={styles.emuCard}>
      <View style={styles.emuTitleRow}>
        <Text style={styles.emuTitle}>Emulador de Telemetria (Backend)</Text>
        <View style={[styles.badge, { backgroundColor: ligado ? "rgba(52,211,153,0.12)" : colors.surface2 }]}>
          <Text style={[styles.badgeTxt, { color: ligado ? colors.emerald : colors.textDim }]}>
            {ligado ? "LIGADO" : "DESLIGADO"}
          </Text>
        </View>
      </View>
      <Text style={styles.emuDesc}>
        Gera leituras de FC/temperatura para todos os pacientes e grava no banco. Deixa o painel "vivo" via polling — lembre de desligar ao terminar.
      </Text>
      <TouchableOpacity
        style={[styles.emuBtn, { backgroundColor: ligado ? colors.surface2 : colors.rose }]}
        onPress={() => onToggleEmulador(!ligado)}
        activeOpacity={0.85}
      >
        <Text style={[styles.emuBtnTxt, { color: ligado ? colors.text : colors.white }]}>
          {ligado ? "Desligar Emulador" : "Ligar Emulador"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={patients}
      keyExtractor={(p) => String(p.paciente.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>Carregando pacientes…</Text>}
      renderItem={({ item }) => {
        const u = item.ultima;
        const nivel = u?.nivel_risco ?? null;
        return (
          <TouchableOpacity style={styles.card} onPress={() => onSelectPatient(item.paciente.id)} activeOpacity={0.85}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{item.paciente.sexo === "F" ? "F" : "M"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>
                  {item.paciente.nome} <Text style={styles.idade}>· {item.paciente.idade} anos</Text>
                </Text>
                <Text style={styles.obs} numberOfLines={1}>
                  {item.paciente.observacoes || "Sem observações no prontuário."}
                </Text>
              </View>
            </View>

            <View style={styles.signals}>
              <View style={styles.signal}>
                <Text style={styles.signalLbl}>FREQUÊNCIA</Text>
                <Text style={styles.signalVal}>{u ? `${u.fc} bpm` : "--"}</Text>
              </View>
              <View style={[styles.signal, styles.signalMid]}>
                <Text style={styles.signalLbl}>TEMP</Text>
                <Text style={styles.signalVal}>{u ? `${u.temperatura} °C` : "--"}</Text>
              </View>
              <View style={styles.signal}>
                <Text style={styles.signalLbl}>CRISE PREDITIVA</Text>
                {nivel ? (
                  <View style={[styles.riskBadge, { backgroundColor: riskColor(nivel) }]}>
                    <Text style={styles.riskTxt}>{nivel.toUpperCase()}</Text>
                  </View>
                ) : (
                  <Text style={styles.signalVal}>AGUARDANDO</Text>
                )}
              </View>
            </View>

            <View style={styles.cardFoot}>
              <Text style={styles.foot}>{u ? `Atualizado: ${hora(u.momento)}` : "Sem telemetria ativa"}</Text>
              <Text style={styles.dossie}>Dossiê ›</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: 16, paddingBottom: 24 },
  empty: { color: colors.textDim, textAlign: "center", marginTop: 30 },

  emuCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  emuTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emuTitle: { color: colors.text, fontWeight: "700", fontSize: 14, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  emuDesc: { color: colors.textDim, fontSize: 11, marginTop: 6, lineHeight: 16 },
  emuBtn: { borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  emuBtnTxt: { fontWeight: "800", fontSize: 12 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: colors.textDim, fontWeight: "800" },
  nome: { color: colors.white, fontWeight: "700", fontSize: 14 },
  idade: { color: colors.textDim, fontWeight: "500", fontSize: 12 },
  obs: { color: colors.textFaint, fontSize: 11, marginTop: 3, fontStyle: "italic" },

  signals: { flexDirection: "row", backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, marginTop: 12 },
  signal: { flex: 1, alignItems: "center" },
  signalMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  signalLbl: { color: colors.textFaint, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  signalVal: { color: colors.white, fontWeight: "700", fontSize: 13, marginTop: 3 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 3 },
  riskTxt: { color: colors.white, fontWeight: "800", fontSize: 10 },

  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  foot: { color: colors.textFaint, fontSize: 10 },
  dossie: { color: colors.rose, fontWeight: "700", fontSize: 11 },
});
