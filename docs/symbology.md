# Symbology

VRL uses canyon topo abbreviations rather than decorative invented markers. The first renderer supports three profiles:

```text
federation  shared default profile
french      French-oriented labels
spanish     Spanish-oriented labels
```

The shared canyon symbols in the current implementation are deliberately conservative:

```text
R    rappel / rapel
D    downclimb / desescalade / destrepe
C    climb / escalade / escalada
M    marche / movement on foot
V    vasque / pool
!    hazard
i    note
```

The Spanish profile uses `P` for pool/poza and `A` for walking/on-foot travel. The French profile uses `DEP` and `SORT` for start and exit labels, while the Spanish profile uses `INI` and `FIN`.

The renderer does not copy federation artwork. It renders these as text symbols on the route profile so public documentation stays portable and easy to diff. Ladder-style technical slopes, inclination, rungs, segment labels, station ticks, anchor-count marks, rappel stage labels, and mid-rappel redirection anchors are diagram structure and route detail, not a new general symbol family.

## Federation Context

The profiles are grounded in federation canyoning/barranquismo terminology, not copied artwork. FFME describes canyon progression through walking, swimming, jumps, slides, downclimbing, rappels, and rope techniques. FEDME describes barranquismo as progression through canyons or ravines on foot and/or swimming, with differentiated technical materials, and its safety/equipment discussion includes rappel heads, handlines, intermediate points, deviations, and technical signage.

Reference pages:

```text
https://www.ffme.fr/montagne-canyon/canyon/pratiquer-canyon/
https://www.ffme.fr/montagne-canyon/canyon/fiches-canyon/
https://fedme.es/barranquismo/
```

## Tropical Extension

VRL adds one non-federation extension for tropical canyons:

```vrl
hazard type=snake severity=medium note="Potential snake area"
hazard type=snake_dense_area severity=high note="Dense snake area"
```

These render as `SN` with a simple snake mark. This is intentionally marked as a VRL extension, not a French or Spanish federation standard.
