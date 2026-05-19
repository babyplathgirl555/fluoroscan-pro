from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib


def train_classifier(features: List[List[float]], labels: List[int], random_state: int = 42) -> Dict[str, Any]:
    X = np.array(features, dtype=float)
    y = np.array(labels, dtype=int)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=random_state)
    clf = RandomForestClassifier(n_estimators=100, random_state=random_state)
    clf.fit(Xtr, ytr)
    preds = clf.predict(Xte)
    report = classification_report(yte, preds, output_dict=True)
    return {'model': clf, 'report': report}


def predict_classifier(model: RandomForestClassifier, features: List[List[float]]) -> List[int]:
    X = np.array(features, dtype=float)
    return model.predict(X).tolist()


def save_model(model: RandomForestClassifier, path: str) -> None:
    joblib.dump(model, path)


def load_model(path: str) -> RandomForestClassifier:
    return joblib.load(path)
