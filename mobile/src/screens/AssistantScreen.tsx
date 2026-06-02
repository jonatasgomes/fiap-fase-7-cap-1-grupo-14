import React, { useEffect, useRef, useState } from "react";
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
import { api } from "../api";
import { PacienteStatus } from "../types";
import { colors } from "../theme";

interface Props {
  patients: PacienteStatus[];
  initialPatientId: number | null;
}

interface Msg {
  id: string;
  sender: "user" | "ai";
  text: string;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AssistantScreen({ patients, initialPatientId }: Props) {
  const [pid, setPid] = useState<number | null>(initialPatientId);
  const [conversaId, setConversaId] = useState<string | undefined>(undefined);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setPid(initialPatientId);
  }, [initialPatientId]);

  // Saudação ao trocar o paciente em contexto. NÃO depende de `patients` (que é
  // recriado pelo polling) — senão a conversa seria apagada a cada atualização.
  useEffect(() => {
    const p = patients.find((x) => x.paciente.id === pid);
    const nome = p ? p.paciente.nome : null;
    setConversaId(undefined);
    setMsgs([
      {
        id: "welcome",
        sender: "ai",
        text: nome
          ? `Olá, Dr(a)! Pronto para discutir o caso de ${nome}. Pergunte sobre risco previsto, conduta ou interpretação da telemetria.`
          : "Olá, Dr(a)! Sou o MédicIA. Escolha um paciente no contexto acima, ou faça uma pergunta clínica geral.",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [msgs, loading]);

  const enviar = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, sender: "user", text: txt }]);
    setLoading(true);
    try {
      const r = await api.postAssistente(txt, pid ?? undefined, conversaId);
      if (r.conversa_id) setConversaId(r.conversa_id);
      setMsgs((m) => [...m, { id: `a${Date.now()}`, sender: "ai", text: r.resposta }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { id: `e${Date.now()}`, sender: "ai", text: `⚠️ ${e?.message || "Erro ao contatar o MédicIA."}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.ctxBar}>
        <Text style={styles.ctxLbl}>Contexto:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Geral" active={pid === null} onPress={() => setPid(null)} />
          {patients.map((p) => (
            <Chip
              key={p.paciente.id}
              label={p.paciente.nome.split(" ")[0]}
              active={pid === p.paciente.id}
              onPress={() => setPid(p.paciente.id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView ref={scrollRef} style={styles.msgs} contentContainerStyle={styles.msgsContent}>
        {msgs.map((m) => (
          <View key={m.id} style={[styles.bubble, m.sender === "ai" ? styles.ai : styles.user]}>
            <Text style={[styles.bubbleTxt, m.sender === "user" && styles.userTxt]}>{m.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.ai, styles.loadingBubble]}>
            <ActivityIndicator color={colors.textDim} />
            <Text style={styles.loadingTxt}>MédicIA analisando…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pergunte ao MédicIA…"
          placeholderTextColor={colors.textFaint}
          onSubmitEditing={enviar}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.send, (loading || !input.trim()) && { opacity: 0.4 }]}
          onPress={enviar}
          disabled={loading || !input.trim()}
        >
          <Text style={styles.sendTxt}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  ctxBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  ctxLbl: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  chips: { gap: 8, paddingRight: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  chipTxt: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTxtOn: { color: colors.white },

  msgs: { flex: 1 },
  msgsContent: { padding: 14, gap: 10 },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: 12, borderWidth: 1 },
  ai: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderTopLeftRadius: 4 },
  user: { alignSelf: "flex-end", backgroundColor: colors.rose600, borderColor: colors.rose, borderTopRightRadius: 4 },
  bubbleTxt: { color: colors.text, fontSize: 13, lineHeight: 19 },
  userTxt: { color: colors.white },
  loadingBubble: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingTxt: { color: colors.textDim, fontSize: 12 },

  inputBar: { flexDirection: "row", padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 14 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
  sendTxt: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
