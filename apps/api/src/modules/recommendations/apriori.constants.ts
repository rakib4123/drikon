/** Minimum number of qualifying orders an itemset must appear in to be "frequent". */
export const MIN_SUPPORT = 2;

/** Minimum confidence (support(antecedent ∪ consequent) / support(antecedent)) for a rule to be kept. */
export const MIN_CONFIDENCE = 0.3;

/** Largest itemset size mined — level-wise Apriori stops after this. */
export const MAX_ITEMSET_SIZE = 3;
