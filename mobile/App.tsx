import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { api, getToken } from "./src/api";
import { PacienteStatus, EmulatorStatus } from "./src/types";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import PanelScreen from "./src/screens/PanelScreen";
import PatientDetailScreen from "./src/screens/PatientDetailScreen";
import AssistantScreen from "./src/screens/AssistantScreen";

type Screen = "panel" | "detail" | "assistant";

export default function App() {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("panel");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [patients, setPatients] = useState<PacienteStatus[]>([]);
  const [emulador, setEmulador] = useState<EmulatorStatus | null>(null);

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setReady(true);
    });
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const list = await api.getPacientes();
      list.sort((a, b) => a.paciente.id - b.paciente.id);
      setPatients(list);
    } catch {
      // mantém a última lista em caso de falha pontual
    }
    try {
      setEmulador(await api.getEmulador());
    } catch {
      // ignora
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAll();
    const t = setInterval(fetchAll, 4000);
    return () => clearInterval(t);
  }, [token, fetchAll]);

  const onLogout = async () => {
    await api.logout();
    setTokenState(null);
    setPatients([]);
    setEmulador(null);
    setSelectedId(null);
    setScreen("panel");
  };

  const onToggleEmulador = async (ligar: boolean) => {
    try {
      setEmulador(ligar ? await api.ligarEmulador([], 3) : await api.desligarEmulador());
    } catch {
      // ignora; o polling reconcilia
    }
  };

  const selectPatient = (id: number) => {
    setSelectedId(id);
    setScreen("detail");
  };
  const openAssistant = (id: number) => {
    setSelectedId(id);
    setScreen("assistant");
  };

  if (!ready) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.rose} size="large" />
      </View>
    );
  }

  if (!token) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={(t) => setTokenState(t)} />
      </>
    );
  }

  const selected = patients.find((p) => p.paciente.id === selectedId)?.paciente ?? null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Constants.statusBarHeight + 8 }]}>
        <Text style={styles.brand}>
          Cardio<Text style={{ color: colors.rose }}>IA</Text>
        </Text>
        <TouchableOpacity onPress={onLogout} hitSlop={8}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {screen === "panel" && (
          <PanelScreen
            patients={patients}
            emulador={emulador}
            onToggleEmulador={onToggleEmulador}
            onSelectPatient={selectPatient}
          />
        )}
        {screen === "detail" && selected && (
          <PatientDetailScreen patient={selected} onBack={() => setScreen("panel")} onOpenAssistant={openAssistant} />
        )}
        {screen === "detail" && !selected && (
          <View style={styles.center}>
            <Text style={styles.dim}>Paciente não encontrado.</Text>
          </View>
        )}
        {screen === "assistant" && <AssistantScreen patients={patients} initialPatientId={selectedId} />}
      </View>

      <View style={styles.tabbar}>
        <TabBtn label="Painel" active={screen === "panel" || screen === "detail"} onPress={() => setScreen("panel")} />
        <TabBtn label="MédicIA" active={screen === "assistant"} onPress={() => setScreen("assistant")} />
      </View>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.tabTxt, active && styles.tabOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { color: colors.white, fontSize: 20, fontWeight: "800" },
  logout: { color: colors.textDim, fontSize: 13, fontWeight: "700" },
  content: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim },
  tabbar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 14,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabTxt: { color: colors.textDim, fontSize: 13, fontWeight: "700" },
  tabOn: { color: colors.rose },
});
