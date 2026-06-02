import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api, getBaseUrl, setBaseUrl } from "../api";
import { colors } from "../theme";

export default function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [usuario, setUsuario] = useState("medico");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    getBaseUrl().then(setApiUrl);
  }, []);

  const entrar = async () => {
    if (loading) return;
    setErro("");
    setLoading(true);
    try {
      if (apiUrl.trim()) await setBaseUrl(apiUrl.trim());
      const token = await api.login(usuario.trim(), senha);
      onLogin(token);
    } catch (e: any) {
      setErro(e?.message || "Senha ou usuário incorreto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>
          <Text style={styles.title}>
            Cardio<Text style={{ color: colors.rose }}>IA</Text> Clinic
          </Text>
          <Text style={styles.subtitle}>Plataforma de Inteligência Cardíaca Total · Fase 7</Text>

          <Text style={styles.label}>IDENTIFICAÇÃO DO CLÍNICO</Text>
          <TextInput
            style={styles.input}
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            placeholder="Ex: medico"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>SENHA PROVISÓRIA</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={entrar}
          />

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <TouchableOpacity style={styles.botao} onPress={entrar} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.botaoTxt}>Autenticar Médico Coordenador</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowServer((s) => !s)}>
            <Text style={styles.serverToggle}>{showServer ? "▾" : "▸"} Configurar servidor (backend)</Text>
          </TouchableOpacity>
          {showServer && (
            <View>
              <TextInput
                style={[styles.input, styles.serverInput]}
                value={apiUrl}
                onChangeText={setApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://...trycloudflare.com"
                placeholderTextColor={colors.textFaint}
              />
              <Text style={styles.serverHint}>
                A URL do túnel é efêmera — ajuste aqui se o backend mudar de endereço.
              </Text>
            </View>
          )}

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Credenciais de ensaio clínico</Text>
            <Text style={styles.demoTxt}>
              usuário: <Text style={styles.demoVal}>medico</Text>   ·   senha:{" "}
              <Text style={styles.demoVal}>cardioia123</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 24,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(244,63,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.25)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  logoHeart: { color: colors.rose, fontSize: 28 },
  title: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textDim, fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 22 },
  label: { color: colors.textDim, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 6,
  },
  erro: { color: colors.rose, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 8 },
  botao: {
    backgroundColor: colors.rose,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  botaoTxt: { color: colors.white, fontWeight: "800", fontSize: 13 },
  serverToggle: { color: colors.textDim, fontSize: 12, fontWeight: "600", marginTop: 16, textAlign: "center" },
  serverInput: { marginTop: 8, fontSize: 12 },
  serverHint: { color: colors.textFaint, fontSize: 10, marginBottom: 4 },
  demoBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 18, paddingTop: 14, alignItems: "center" },
  demoTitle: { color: colors.textFaint, fontSize: 10, fontWeight: "700" },
  demoTxt: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  demoVal: { color: colors.text, fontWeight: "800" },
});
