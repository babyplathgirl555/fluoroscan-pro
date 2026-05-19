from typing import List, Dict, Any
import numpy as np
from scipy import stats


def compare_two_groups(control: List[float], treatment: List[float]) -> Dict[str, Any]:
    """Perform t-test (independent) and return p-value and statistics."""
    a = np.array(control, dtype=float)
    b = np.array(treatment, dtype=float)
    # Welch's t-test
    tstat, pval = stats.ttest_ind(a, b, equal_var=False, nan_policy='omit')
    return {'tstat': float(tstat), 'pvalue': float(pval)}


def anova_groups(groups: List[List[float]]) -> Dict[str, Any]:
    """Perform one-way ANOVA across multiple groups."""
    arrays = [np.array(g, dtype=float) for g in groups]
    fstat, pval = stats.f_oneway(*arrays)
    return {'fstat': float(fstat), 'pvalue': float(pval)}


def multiple_comparisons(groups: List[List[float]]) -> Dict[str, Any]:
    """Return basic ANOVA and pairwise t-tests (Bonferroni corrected).

    groups: list of numeric lists
    """
    anova = anova_groups(groups)
    # pairwise
    pairs = {}
    n = len(groups)
    m = n * (n - 1) // 2
    correction = m
    for i in range(n):
        for j in range(i + 1, n):
            res = compare_two_groups(groups[i], groups[j])
            p_corr = min(res['pvalue'] * correction, 1.0)
            pairs[f'{i}_vs_{j}'] = {'tstat': res['tstat'], 'pvalue': res['pvalue'], 'p_bonf': p_corr}
    return {'anova': anova, 'pairwise': pairs}
