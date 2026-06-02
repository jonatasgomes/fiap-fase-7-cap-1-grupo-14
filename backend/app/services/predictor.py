"""Motor preditivo da Fase 6.

Modelo sklearn real treinado sobre um dataset sintético de sinais cardíacos
(o conteúdo original da Fase 6 foi perdido, então reconstruímos um substituto
plausível). A regra geradora codifica fatores clínicos conhecidos — taquicardia,
bradicardia, febre, hipotermia e idade — convertidos em uma probabilidade de
risco; rótulos binários são amostrados dessa probabilidade e o RandomForest
aprende a recuperá-la (predict_proba ≈ risco).

As features são amostradas de forma UNIFORME em toda a faixa plausível, para que
os extremos clínicos (ex.: FC 150 + febre) fiquem bem representados e o modelo
seja bem calibrado também nessas regiões.
"""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier

RNG_SEED = 42

_model: RandomForestClassifier | None = None


def _sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-z))


def _risk_index(hr: np.ndarray, temp: np.ndarray, age: np.ndarray) -> np.ndarray:
    """Probabilidade de risco a partir de desvios clínicos normalizados."""
    tachy = np.maximum(0.0, hr - 95) / 55.0
    brady = np.maximum(0.0, 55 - hr) / 22.0
    fever = np.maximum(0.0, temp - 37.3) / 2.2
    hypo = np.maximum(0.0, 36.0 - temp) / 1.8
    age_f = np.maximum(0.0, age - 55) / 40.0
    z = -2.4 + 4.0 * tachy + 3.6 * brady + 4.2 * fever + 3.6 * hypo + 1.2 * age_f
    return _sigmoid(z)


def _generate_dataset(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    hr = rng.uniform(40, 190, n)
    temp = rng.uniform(34.5, 41.0, n)
    age = rng.uniform(30, 90, n)
    r = _risk_index(hr, temp, age)
    y = (rng.random(n) < r).astype(int)
    X = np.column_stack([hr, temp, age])
    return X, y


def train(n: int = 8000) -> RandomForestClassifier:
    global _model
    rng = np.random.default_rng(RNG_SEED)
    X, y = _generate_dataset(n, rng)
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=20,
        random_state=RNG_SEED,
        n_jobs=-1,
    )
    model.fit(X, y)
    _model = model
    return model


def _ensure_model() -> RandomForestClassifier:
    return _model if _model is not None else train()


def _label_and_reco(score: float) -> tuple[str, str]:
    if score >= 0.67:
        return "alto", (
            "Risco elevado de evento cardíaco. Acionar equipe médica e "
            "considerar protocolo de emergência."
        )
    if score >= 0.34:
        return "medio", (
            "Risco moderado. Intensificar monitoramento e reavaliar os "
            "sinais vitais em ~15 minutos."
        )
    return "baixo", "Sinais vitais dentro do esperado. Manter monitoramento de rotina."


def predict(hr: float, temp: float, age: int) -> tuple[float, str, str]:
    model = _ensure_model()
    X = np.array([[float(hr), float(temp), float(age)]])
    classes = list(model.classes_)
    score = float(model.predict_proba(X)[0, classes.index(1)]) if 1 in classes else 0.0
    label, reco = _label_and_reco(score)
    return round(score, 4), label, reco
